"""ADB helpers for planned Android tests; records actual actions and evidence.

Set IT_SUPPORT_QA_DIR to a private output directory containing results.json.
Only run against a dedicated test device and local Firebase emulators.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import time
from xml.etree import ElementTree as ET


class AndroidQA:
    package = 'za.ac.eduvos.campusithelp'

    def __init__(self):
        self.serial = os.environ.get('ANDROID_SERIAL', 'emulator-5554')
        self.root = Path(os.environ.get('IT_SUPPORT_QA_DIR', '/tmp/it-support-qa'))
        self.evidence = self.root / 'evidence'
        self.evidence.mkdir(parents=True, exist_ok=True)
        self.current = None
        self.checks = []
        self.files = []
        self.device = None
        if os.environ.get('IT_SUPPORT_QA_FAST_UI') == '1':
            import uiautomator2
            self.device = uiautomator2.connect(self.serial)

    def adb(self, *args, binary=False, timeout=45):
        result = subprocess.run(['adb', '-s', self.serial, *map(str, args)],
                                capture_output=True, timeout=timeout)
        if result.returncode:
            # Input arguments can contain credentials; never include them in errors.
            raise RuntimeError(result.stderr.decode(errors='replace').strip())
        return result.stdout if binary else result.stdout.decode(errors='replace')

    def event(self, action, detail=''):
        record = dict(time=datetime.now(timezone.utc).isoformat(),
                      case=self.current, action=action, detail=detail)
        with (self.root / 'actions.jsonl').open('a') as f:
            f.write(json.dumps(record) + '\n')

    def ui(self):
        if self.device is not None:
            return ET.fromstring(self.device.dump_hierarchy(compressed=False))
        for attempt in range(3):
            try:
                self.adb('shell', 'uiautomator', 'dump', '/sdcard/it-support-qa-ui.xml')
                text = self.adb('exec-out', 'cat', '/sdcard/it-support-qa-ui.xml')
                return ET.fromstring(text)
            except (ET.ParseError, RuntimeError):
                if attempt == 2:
                    raise
                time.sleep(1)

    @staticmethod
    def bounds(node):
        nums = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
        return nums if len(nums) == 4 else [0, 0, 0, 0]

    def nodes(self, label, tree=None, field=False):
        tree = tree if tree is not None else self.ui()
        found = []
        for node in tree.iter('node'):
            if node.get('visible-to-user', 'true') != 'true':
                continue
            if field and node.get('class') != 'android.widget.EditText':
                continue
            if label in (node.get('text'), node.get('content-desc')):
                x1, y1, x2, y2 = self.bounds(node)
                if x2 > x1 and y2 > y1:
                    found.append(node)
        return found

    def swipe(self, up=True):
        tree = self.ui()
        scroll = next((n for n in tree.iter('node') if n.get('scrollable') == 'true'), None)
        if scroll is None:
            scroll = next(tree.iter('node'))
        x1, y1, x2, y2 = self.bounds(scroll)
        x = (x1+x2)//2
        top, bottom = int(y1+(y2-y1)*.25), int(y1+(y2-y1)*.75)
        start, end = (bottom, top) if up else (top, bottom)
        if self.device is not None:
            self.device.swipe(x, start, x, end, duration=.35)
        else:
            self.adb('shell', 'input', 'swipe', x, start, x, end, 350)
        self.event('scroll', 'down' if up else 'up')
        time.sleep(.5)

    def find(self, label, field=False, scroll=0):
        for attempt in range(scroll+1):
            for settle in range(3):
                found = self.nodes(label, field=field)
                if found:
                    clickable = [n for n in found if n.get('clickable') == 'true']
                    return (clickable or found)[-1]
                time.sleep(.5)
            if attempt < scroll:
                self.swipe()
        raise AssertionError('Visible UI element not found: ' + label)

    def tap(self, label, scroll=0):
        node = self.find(label, scroll=scroll)
        x1, y1, x2, y2 = self.bounds(node)
        if self.device is not None:
            self.device.click((x1+x2)//2, (y1+y2)//2)
        else:
            self.adb('shell', 'input', 'tap', (x1+x2)//2, (y1+y2)//2)
        self.event('tap', label)
        time.sleep(.5)

    def fill(self, label, value, secret=False, scroll=0):
        node = self.find(label, field=True, scroll=scroll)
        x1, y1, x2, y2 = self.bounds(node)
        if self.device is not None:
            self.device.click((x1+x2)//2, (y1+y2)//2)
            self.device(className='android.widget.EditText', description=label).set_text(value)
            self.event('fill', label + (' [secret omitted]' if secret else ''))
            time.sleep(.3)
            return
        self.adb('shell', 'input', 'tap', (x1+x2)//2, (y1+y2)//2)
        self.adb('shell', 'input', 'keyevent', 123)
        count = min(len(node.get('text', ''))+2, 512)
        self.adb('shell', 'input', 'keyevent', *([67]*count))
        self.adb('shell', 'input', 'text', shlex.quote(value.replace(' ', '%s')))
        self.event('fill', label + (' [secret omitted]' if secret else ''))
        time.sleep(.3)

    def hide_keyboard(self):
        state = self.adb('shell', 'dumpsys', 'input_method')
        if re.search(r'mInputShown=true|mIsInputViewShown=true', state):
            if self.device is not None:
                self.device.press('back')
            else:
                self.adb('shell', 'input', 'keyevent', 4)
            self.event('hide keyboard')
            time.sleep(.3)

    def back(self):
        if self.device is not None:
            self.device.press('back')
        else:
            self.adb('shell', 'input', 'keyevent', 4)
        self.event('Android Back')
        time.sleep(.5)

    def text(self):
        return '\n'.join(filter(None, (n.get('text') or n.get('content-desc')
                                      for n in self.ui().iter('node'))))

    def expect(self, text, timeout=30):
        end = time.monotonic()+timeout
        while time.monotonic() < end:
            if text in self.text():
                self.checks.append('UI displayed: ' + text)
                return
            time.sleep(.5)
        raise AssertionError('Expected UI text was not displayed: ' + text)

    def check(self, condition, observation):
        if not condition:
            raise AssertionError(observation)
        self.checks.append(observation)

    def capture(self, name):
        stem = re.sub(r'[^A-Za-z0-9_-]', '-', name)
        path = self.evidence / (stem+'.png')
        if path.exists():
            stem += '-'+datetime.now().strftime('%H%M%S')
            path = self.evidence / (stem+'.png')
        path.write_bytes(self.adb('exec-out', 'screencap', '-p', binary=True))
        try:
            xml = ET.tostring(self.ui(), encoding='unicode')
            (self.evidence / (stem+'.xml')).write_text(xml)
        except Exception as error:
            self.event('UI capture unavailable', str(error))
        if self.current:
            self.files.append(path.name)
        self.event('screenshot', path.name)
        return path

    def store(self, case_id, **fields):
        path = self.root / 'results.json'
        data = json.loads(path.read_text())
        row = next(c for c in data['cases'] if c['id'] == case_id)
        if 'status' in fields and row.get('executed_at'):
            previous = {k:row.get(k) for k in ('status','actual','notes','evidence','checks','executed_at')}
            row.setdefault('attempts', []).append(previous)
            if fields['status'] == 'PASS' and row['status'] == 'FAIL':
                fields['status'] = 'RETEST PASS'
        row.update(fields)
        path.write_text(json.dumps(data, indent=2)+'\n')

    @contextmanager
    def case(self, case_id, actual='', notes=''):
        self.current, self.checks, self.files = case_id, [], []
        self.event('case started')
        try:
            yield self
            if not self.checks:
                raise AssertionError('No observation was asserted for this case')
            self.capture(case_id+'-result')
            self.store(case_id, status='PASS', actual=actual or '; '.join(self.checks),
                       notes=notes, evidence=self.files, checks=self.checks,
                       executed_at=datetime.now(timezone.utc).isoformat())
            self.event('case passed')
        except Exception as error:
            try:
                self.capture(case_id+'-failure')
            except Exception:
                pass
            self.store(case_id, status='FAIL', actual=str(error), notes=notes,
                       evidence=self.files, checks=self.checks,
                       executed_at=datetime.now(timezone.utc).isoformat())
            self.event('case failed', str(error))
            raise
        finally:
            self.current = None

    def blocked(self, case_id, reason):
        self.store(case_id, status='BLOCKED', actual='Not executed: '+reason,
                   notes=reason, evidence=[])


if __name__ == '__main__':
    import sys
    qa = AndroidQA()
    if len(sys.argv) > 1 and sys.argv[1] == 'capture':
        print(qa.capture(sys.argv[2]))
    else:
        print(qa.text())
