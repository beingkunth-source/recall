"""
Local AI Assistant service for Recall.
Handles:
1. Mathematical calculations and unit evaluations (e.g., "calc 25*140", "15% of 850", "sqrt(144) + 2^5", etc.)
2. Natural language file search intent parsing (e.g., "find pdf about invoice from last week", "find images with receipt")
3. System task suggestions and local AI intent routing without external cloud dependencies.
"""

import ast
import json
import math
import operator
import os
import re
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _read_user_ai_settings() -> Dict[str, Any]:
    """Reads configured AI settings from Electron userData settings.json."""
    try:
        appdata = os.environ.get("APPDATA", "")
        settings_file = Path(appdata) / "Recall" / "settings.json"
        if settings_file.exists():
            with open(settings_file, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def query_ollama(prompt: str, endpoint: str = "http://127.0.0.1:11434", model: str = "llama3.2") -> Optional[str]:
    """Queries local Ollama endpoint for rapid local reasoning."""
    try:
        url = f"{endpoint.rstrip('/')}/api/generate"
        payload = json.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 120}
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "").strip()
    except Exception:
        return None


# Safe AST-based math evaluator
_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

_SAFE_MATH_FUNCS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "abs": abs,
    "round": round,
    "ceil": math.ceil,
    "floor": math.floor,
    "pi": math.pi,
    "e": math.e,
}


def _eval_node(node: ast.AST) -> Any:
    if isinstance(node, ast.Constant):  # numbers, string
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numbers supported")
    elif isinstance(node, ast.BinOp):
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            return _SAFE_OPERATORS[op_type](left, right)
        raise ValueError(f"Unsupported operator: {op_type}")
    elif isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand)
        op_type = type(node.op)
        if op_type in _SAFE_OPERATORS:
            return _SAFE_OPERATORS[op_type](operand)
        raise ValueError(f"Unsupported unary operator: {op_type}")
    elif isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id.lower()
            if func_name in _SAFE_MATH_FUNCS and callable(_SAFE_MATH_FUNCS[func_name]):
                args = [_eval_node(a) for a in node.args]
                return _SAFE_MATH_FUNCS[func_name](*args)
        raise ValueError("Unsupported function call")
    elif isinstance(node, ast.Name):
        const_name = node.id.lower()
        if const_name in _SAFE_MATH_FUNCS and not callable(_SAFE_MATH_FUNCS[const_name]):
            return _SAFE_MATH_FUNCS[const_name]
        raise ValueError(f"Unknown variable: {node.id}")
    raise ValueError(f"Unsupported expression element: {type(node)}")


def safe_calculate(expression: str) -> Optional[Tuple[float, str]]:
    """
    Safely evaluate an algebraic or arithmetic expression string.
    Returns (numeric_result, formatted_string) or None if not an arithmetic expression.
    """
    expr = expression.strip()
    if not expr:
        return None

    # Handle percentage: "15% of 200" or "15% * 200"
    pct_match = re.match(r"^(\d+(?:\.\d+)?)\s*%\s*(?:of|\*)\s*(\d+(?:\.\d+)?)$", expr, re.IGNORECASE)
    if pct_match:
        pct = float(pct_match.group(1))
        val = float(pct_match.group(2))
        res = (pct / 100.0) * val
        return res, f"{res:g}"

    # Handle "X as % of Y"
    pct_of_match = re.match(r"^(\d+(?:\.\d+)?)\s*(?:as\s+%\s+of|\/\s*in\s*%)\s*(\d+(?:\.\d+)?)$", expr, re.IGNORECASE)
    if pct_of_match:
        part = float(pct_of_match.group(1))
        total = float(pct_of_match.group(2))
        if total != 0:
            res = (part / total) * 100.0
            return res, f"{res:g}%"

    # Replace power operator ^ with **
    sanitized = expr.replace("^", "**").replace("×", "*").replace("÷", "/")
    # Remove leading '=' or 'calc ' or 'calculate '
    sanitized = re.sub(r"^(?:calc(?:ulate)?|=|what\s+is\s+|eval(?:uate)?\s+)", "", sanitized, flags=re.IGNORECASE).strip()

    # Must contain at least one digit or recognized math constant
    if not re.search(r"\d|pi|sqrt|sin|cos", sanitized, re.IGNORECASE):
        return None

    try:
        tree = ast.parse(sanitized, mode="eval")
        res = _eval_node(tree.body)
        if isinstance(res, (int, float)):
            # Formatted nicely: e.g. 10 instead of 10.0 if integer
            if isinstance(res, float) and res.is_integer():
                formatted = str(int(res))
            else:
                formatted = f"{res:,.6g}"
            return float(res), formatted
    except Exception:
        return None

    return None


@dataclass
class IntentResult:
    intent_type: str  # 'calc', 'find_file', 'open_app', 'web_search', 'unknown'
    confidence: float
    title: str
    description: str
    action_data: Dict[str, Any]


def parse_user_intent(query: str) -> Optional[IntentResult]:
    """
    Parse a natural language query using the local AI intent engine.
    """
    q = query.strip()
    if not q:
        return None

    # 1. Calculation Intent Check
    # Check if starts with "calc", "calculate", "what is", or is a direct math expression
    is_calc_prefix = re.match(r"^(?:calc(?:ulate)?|eval(?:uate)?|what\s+is|\=)\s+(.+)$", q, re.IGNORECASE)
    calc_expr = is_calc_prefix.group(1) if is_calc_prefix else q

    calc_res = safe_calculate(calc_expr)
    if calc_res is not None:
        num_val, text_val = calc_res
        return IntentResult(
            intent_type="calc",
            confidence=0.98 if is_calc_prefix else 0.85,
            title=f"= {text_val}",
            description=f"Local calculation: {calc_expr.strip()} = {text_val}",
            action_data={
                "expression": calc_expr.strip(),
                "result": num_val,
                "display": text_val,
                "copy_text": text_val,
            },
        )

    # 2. Natural Language File Finder Intent
    # e.g.: "find pdf about invoice", "show me screenshots from yesterday", "search notes about meeting"
    file_find_match = re.match(
        r"^(?:find|search(?:\s+for)?|locate|show(?:\s+me)?|look(?:\s+for)?|get)\s+(?:all\s+)?(pdf(?:s)?|image(?:s)?|note(?:s)?|screenshot(?:s)?|doc(?:ument)?(?:s)?)?(?:\s+(?:about|named|with|for|containing|of)\s+)?(.*)$",
        q,
        re.IGNORECASE,
    )

    if file_find_match:
        target_type_raw = (file_find_match.group(1) or "").lower()
        search_terms = (file_find_match.group(2) or "").strip()

        file_type = None
        if "pdf" in target_type_raw:
            file_type = "pdf"
        elif any(k in target_type_raw for k in ["image", "screenshot", "pic", "photo"]):
            file_type = "image"
        elif "note" in target_type_raw:
            file_type = "note"
        elif "doc" in target_type_raw:
            file_type = "document"

        if search_terms or file_type:
            display_terms = search_terms or f"all {file_type or 'files'}"
            type_label = f" [{file_type.upper()}]" if file_type else ""
            return IntentResult(
                intent_type="find_file",
                confidence=0.92,
                title=f"Find{type_label}: \"{display_terms}\"",
                description=f"Local AI file search for {display_terms} across indexed roots",
                action_data={
                    "query": search_terms,
                    "file_type": file_type,
                    "original": q,
                },
            )

    # 3. If user has Ollama configured and starts query with "ai:" or "ask:", consult Ollama model
    ai_ask_match = re.match(r"^(?:ai|ask|llm)\s*:\s*(.+)$", q, re.IGNORECASE)
    if ai_ask_match:
        prompt_text = ai_ask_match.group(1).strip()
        settings = _read_user_ai_settings()
        endpoint = settings.get("ollamaEndpoint", "http://127.0.0.1:11434")
        model = settings.get("ollamaModel", "llama3.2")
        answer = query_ollama(prompt_text, endpoint=endpoint, model=model)
        if answer:
            snippet = answer[:160] + "..." if len(answer) > 160 else answer
            return IntentResult(
                intent_type="ai_response",
                confidence=0.95,
                title=f"AI ({model}): {snippet}",
                description=answer,
                action_data={
                    "prompt": prompt_text,
                    "model": model,
                    "full_answer": answer,
                    "display": answer,
                },
            )

    return None
