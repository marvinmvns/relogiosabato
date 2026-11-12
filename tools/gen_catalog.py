"""Gera core/catalog.generated.js a partir do CommandUtils.java descompilado do Podsfine.

Lê o código como TEXTO (nunca executa nada). Para cada método público que devolve
byte[], extrai cmd/key da chamada generalSendBytes e classifica o payload:
  empty    sem payload
  fixed    bytes literais
  u8       um ou mais parâmetros inteiros, um byte cada, na ordem
  bool     um parâmetro booleano -> 1/0
  complex  qualquer outra coisa (só documentado; o app implementa à mão os importantes)

Uso:
  python3 -I tools/gen_catalog.py \
      private/decompiled/podsfine-1.2.3/sources/com/lianhezhuli/podsFine \
      core/catalog.generated.js
"""
import json
import pathlib
import re
import sys

METHOD_RE = re.compile(r'public static byte\[\] (\w+)\(([^)]*)\)\s*\{')
CONST_RE = re.compile(r'public static (?:final )?(?:byte|int) (\w+) = (-?\d+);')
CALL_RE = re.compile(r'generalSendBytes\(([^;]*)\);')
LOG_RE = re.compile(r'(?:WriteLogUtils\.initWrite|LogUtils\.\w)\("([^"]*)"')


def to_byte(n):
    return n & 0xFF


def constants(root):
    out = {}
    for rel in ('ble/utils/CommandUtils.java', 'utils/ProtocolLog.java'):
        p = root / rel
        if p.exists():
            for name, value in CONST_RE.findall(p.read_text(encoding='utf-8', errors='replace')):
                out[name] = int(value)
                out[f'ProtocolLog.{name}'] = int(value)
    return out


def method_bodies(text):
    for m in METHOD_RE.finditer(text):
        start = m.end()
        depth, i = 1, start
        while depth and i < len(text):
            depth += {'{': 1, '}': -1}.get(text[i], 0)
            i += 1
        line = text.count('\n', 0, m.start()) + 1
        yield m.group(1), m.group(2).strip(), text[start:i - 1], line


def split_args(s):
    parts, depth, cur = [], 0, ''
    for ch in s:
        if ch in '([{':
            depth += 1
        elif ch in ')]}':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        parts.append(cur.strip())
    return parts


def resolve(token, consts):
    t = re.sub(r'\(byte\)\s*', '', token).strip()
    if re.fullmatch(r'-?\d+', t):
        return to_byte(int(t))
    if t in consts:
        return to_byte(consts[t])
    return None


def parse_params(sig):
    params = []
    for p in split_args(sig):
        bits = p.split()
        if len(bits) >= 2:
            params.append({'javaType': ' '.join(bits[:-1]), 'name': bits[-1]})
    return params


def classify(payload_expr, params):
    if payload_expr is None:
        return 'empty', [], []
    expr = re.sub(r'\(byte\)\s*', '', payload_expr).strip()
    if re.fullmatch(r'new byte\[0\]', expr):
        return 'empty', [], []
    m = re.fullmatch(r'new byte\[\]\{(.*)\}', expr, re.S)
    if not m:
        return 'complex', [], []
    items = [x.strip() for x in split_args(m.group(1))]
    if all(re.fullmatch(r'-?\d+', x) for x in items):
        return 'fixed', [to_byte(int(x)) for x in items], []
    names = {p['name']: p['javaType'] for p in params}
    if len(items) == 1:
        b = re.fullmatch(r'(\w+) \? 1 : 0', items[0])
        if b and names.get(b.group(1)) == 'boolean':
            return 'bool', [], [b.group(1)]
    if all(x in names and names[x] in ('int', 'byte', 'short') for x in items):
        return 'u8', [], items
    return 'complex', [], []


def main():
    root = pathlib.Path(sys.argv[1])
    out_path = pathlib.Path(sys.argv[2])
    source = root / 'ble/utils/CommandUtils.java'
    text = source.read_text(encoding='utf-8', errors='replace')
    consts = constants(root)
    entries = []
    for name, sig, body, line in method_bodies(text):
        if name in ('generalSendBytes', 'concatArrys'):
            continue
        calls = CALL_RE.findall(body)
        params = parse_params(sig)
        hint = next(iter(LOG_RE.findall(body)), '')
        entry = {'method': name, 'line': line, 'params': params, 'hint': hint, 'variants': len(calls)}
        if not calls:
            entry.update(cmd=None, key=None, kind='complex', fixed=[], paramOrder=[])
            entries.append(entry)
            continue
        args = split_args(calls[0])
        cmd = resolve(args[0], consts) if args else None
        key = resolve(args[1], consts) if len(args) > 1 else None
        kind, fixed, order = classify(args[2] if len(args) > 2 else None, params)
        entry.update(cmd=cmd, key=key, kind=kind, fixed=fixed, paramOrder=order)
        entries.append(entry)

    header = (
        '// GERADO por tools/gen_catalog.py a partir do CommandUtils.java do Podsfine 1.2.3.\n'
        '// Não editar à mão: rode o gerador de novo. Metadados apenas (sem código do fabricante).\n'
    )
    out_path.write_text(header + 'export const CATALOG = ' + json.dumps(entries, ensure_ascii=False, indent=1) + ';\n',
                        encoding='utf-8')
    kinds = {}
    for e in entries:
        kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
    unresolved = [e['method'] for e in entries if e['cmd'] is None or e['key'] is None]
    print(f'{len(entries)} métodos; tipos: {kinds}')
    print(f'sem cmd/key resolvidos: {unresolved}')


if __name__ == '__main__':
    main()
