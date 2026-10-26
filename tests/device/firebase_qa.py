"""Local-only Firebase test fixtures and independent persistence inspection."""
import json
import os
from pathlib import Path
import secrets
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen


class LocalFirebase:
    project = 'it-support-eduvos'

    def __init__(self):
        self.root = Path(os.environ.get('IT_SUPPORT_QA_DIR', '/tmp/it-support-qa'))
        self.root.mkdir(parents=True, exist_ok=True)
        path = self.root / 'credentials.json'
        if not path.exists():
            data = {
                'student': {'email': 'qa-student@vossie.net', 'name': 'QA Student'},
                'staff': {'email': 'qa-staff@eduvos.com', 'name': 'QA Staff'},
                'support': {'email': 'qa-support@eduvos.com', 'name': 'QA Support'},
            }
            for account in data.values():
                account['password'] = secrets.token_hex(12)
            path.write_text(json.dumps(data))
            path.chmod(0o600)
        self.accounts = json.loads(path.read_text())

    def request(self, service, path, data=None, token=None, method=None):
        # Hard-coded loopback destinations prevent this helper reaching a live project.
        port = {'auth': 9099, 'firestore': 8080}[service]
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer '+token
        payload = json.dumps(data).encode() if data is not None else None
        req = Request('http://127.0.0.1:'+str(port)+path, data=payload,
                      headers=headers, method=method or ('POST' if payload else 'GET'))
        try:
            with urlopen(req, timeout=20) as response:
                body = response.read()
                return json.loads(body) if body else {}
        except HTTPError as error:
            raise RuntimeError('Local '+service+' returned HTTP '+str(error.code)) from None

    def signup(self, role):
        account = self.accounts[role]
        result = self.request('auth', '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-qa',
                              dict(email=account['email'], password=account['password'],
                                   displayName=account['name'], returnSecureToken=True))
        self.update(result['localId'], emailVerified=True,
                    customAttributes=json.dumps({'support': True} if role == 'support' else {}))
        return result['localId']

    def update(self, uid, **fields):
        return self.request('auth', '/identitytoolkit.googleapis.com/v1/projects/'+self.project+'/accounts:update',
                            dict(localId=uid, **fields), token='owner')

    def signin(self, role):
        account = self.accounts[role]
        return self.request('auth', '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-qa',
                            dict(email=account['email'], password=account['password'], returnSecureToken=True))

    def action_code(self, role, kind):
        records = self.request('auth', '/emulator/v1/projects/'+self.project+'/oobCodes').get('oobCodes', [])
        records = [r for r in records if r.get('email') == self.accounts[role]['email']
                   and r.get('requestType') == kind]
        if not records:
            raise AssertionError('No local '+kind+' action was generated')
        return records[-1]['oobCode']

    def verify(self, role):
        return self.request('auth', '/identitytoolkit.googleapis.com/v1/accounts:update?key=local-qa',
                            dict(oobCode=self.action_code(role, 'VERIFY_EMAIL')))

    def reset_password(self, role, password):
        result = self.request('auth', '/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=local-qa',
                              dict(oobCode=self.action_code(role, 'PASSWORD_RESET'), newPassword=password))
        self.accounts[role]['password'] = password
        path = self.root / 'credentials.json'
        path.write_text(json.dumps(self.accounts))
        path.chmod(0o600)
        return result

    @staticmethod
    def decode(value):
        if 'mapValue' in value:
            return {k: LocalFirebase.decode(v) for k, v in value['mapValue'].get('fields', {}).items()}
        if 'arrayValue' in value:
            return [LocalFirebase.decode(v) for v in value['arrayValue'].get('values', [])]
        return next(iter(value.values())) if value else None

    def documents(self, collection, token='owner'):
        path = '/v1/projects/'+self.project+'/databases/(default)/documents/'+quote(collection, safe='/')
        result = self.request('firestore', path+'?pageSize=100', token=token)
        return [dict(_id=d['name'].rsplit('/', 1)[-1],
                     **{k:self.decode(v) for k,v in d.get('fields', {}).items()})
                for d in result.get('documents', [])]

    def document(self, path, token='owner'):
        result = self.request('firestore', '/v1/projects/'+self.project+'/databases/(default)/documents/'+quote(path, safe='/'), token=token)
        return {k:self.decode(v) for k,v in result.get('fields', {}).items()}

    def evidence(self, name, data):
        # Callers provide only synthetic records, never identity tokens/action codes.
        path = self.root / 'evidence' / (name+'.json')
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(data, indent=2)+'\n')
        return path.name
