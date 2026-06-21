import time
import json
import pydirectinput
import os
import pygetwindow
import sys
from elevate import elevate

# 键盘映射
KEYMAP = {
    'H': {'C': 'q', 'D': 'w', 'E': 'e', 'F': 'r', 'G': 't', 'A': 'y', 'B': 'u'},
    'M': {'C': 'a', 'D': 's', 'E': 'd', 'F': 'f', 'G': 'g', 'A': 'h', 'B': 'j'},
    'L': {'C': 'z', 'D': 'x', 'E': 'c', 'F': 'v', 'G': 'b', 'A': 'n', 'B': 'm'}
}

# 黑键修饰规则
BLACK_KEY_RULES = {
    'Cs': 'shift',   # C#
    'Ds': 'ctrl',    # D# (同 Eb)
    'Fs': 'shift',   # F#
    'Gs': 'shift',   # G#
    'As': 'ctrl',    # A# (同 Bb)
    # 降号兼容
    'Eb': 'ctrl',
    'Bb': 'ctrl',
}

pydirectinput.PAUSE = 0.001  # 全局按键间隔（秒）

def note_delay_seconds(bpm: float, nvr: float) -> float:
    """计算音符持续时间（秒）"""
    if bpm <= 0:
        return 0.0
    return (30000.0 / bpm) * nvr / 1000.0

def parse_note(note_name: str):
    """
    解析音符名，返回 (修饰键, 主键)
    修饰键可能为 'shift' / 'ctrl' / ''（无）
    """
    if note_name.startswith('H'):
        region = 'H'
        suffix = note_name[1:]
    elif note_name.startswith('L'):
        region = 'L'
        suffix = note_name[1:]
    else:
        region = 'M'
        suffix = note_name

    mod = ''
    white = suffix
    if suffix in BLACK_KEY_RULES:
        mod = BLACK_KEY_RULES[suffix]

        white = suffix.rstrip('sb')

    main_key = KEYMAP[region][white]
    return mod, main_key

def activate_window(title: str = '异环') -> bool:
    """激活指定标题的窗口，返回是否成功"""
    windows = pygetwindow.getWindowsWithTitle(title)
    if not windows:
        print(f"错误：未找到标题包含 '{title}' 的窗口")
        return False
    window = windows[0]
    try:
        window.activate()
        return True
    except Exception as e:
        print(f"激活窗口失败：{e}")
        return False

def load_sheet(file_path: str):
    """加载 JSON 乐谱文件，返回 (bpm, sheet)"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['bpm'], data['sheet']

def select_sheet() -> str:
    """交互选择乐谱文件（从 ./sheets/ 目录）"""
    sheet_dir = './sheets/'
    if not os.path.isdir(sheet_dir):
        print(f"错误：目录 '{sheet_dir}' 不存在")
        sys.exit(1)

    files = [f for f in os.listdir(sheet_dir) if f.endswith('.json')]
    if not files:
        print(f"错误：目录 '{sheet_dir}' 中没有 JSON 文件")
        sys.exit(1)

    print("可用的乐谱文件：")
    for idx, fname in enumerate(files):
        print(f"{idx}: {fname}")

    while True:
        try:
            choice = int(input("请输入序号："))
            if 0 <= choice < len(files):
                return os.path.join(sheet_dir, files[choice])
            else:
                print(f"请输入 0 ~ {len(files) - 1} 之间的数字")
        except ValueError:
            print("请输入有效数字")

def perform_gestures(active_notes: list, duration_sec: float):
    """
    将 chord 内的所有音符转换为依次的按键序列（去重），每个按键快速按下并松开，
    最后等待 duration_sec 秒。
    """
    if not active_notes:
        if duration_sec > 0:
            time.sleep(duration_sec)
        return
    
    print(f'Now playing: {active_notes}')
    
    keys_seq = []
    seen = set()
    for note in active_notes:
        mod, main = parse_note(note)
        key_tuple = (mod, main)
        if key_tuple not in seen:
            seen.add(key_tuple)
            keys_seq.append({"mod": mod, "main": main})

    for key in keys_seq:
        mod = key["mod"]
        main = key["main"]
        if mod:
            # 有修饰键：先按下修饰键，再按下主键
            pydirectinput.keyDown(mod)
            pydirectinput.keyDown(main)
            # time.sleep(0.005)
            pydirectinput.keyUp(main)
            pydirectinput.keyUp(mod)
        else:
            pydirectinput.keyDown(main)
            # time.sleep(0.005)
            pydirectinput.keyUp(main)
        time.sleep(0.001)

    if duration_sec > 0:
        time.sleep(duration_sec)

def play_sheet(sheet_file: str):
    """播放乐谱，精确时间调度，支持和弦拆分为序列"""
    bpm, sheet = load_sheet(sheet_file)

    next_beat_time = time.perf_counter()

    for beat in sheet:
        notes = [n for n in beat['note'] if n and n != "STOP"]
        duration = note_delay_seconds(bpm, beat['nvr'])

        now = time.perf_counter()
        if now < next_beat_time:
            time.sleep(next_beat_time - now)

        perform_gestures(notes, duration)

        next_beat_time = time.perf_counter() + duration

if __name__ == "__main__":
    elevate()

    selected = select_sheet()

    if not activate_window():
        print("请确保游戏窗口已打开，且标题包含 '异环'")
        sys.exit(1)

    time.sleep(0.5)

    print(f"开始演奏：{selected}")
    play_sheet(selected)
    print("演奏结束，三秒后自动退出")
    time.sleep(3)