# -*- mode: python -*-

block_cipher = None


a = Analysis(['../backend/backend/otone_client.py'],
             pathex=[],
             binaries=None,
             datas=[('../backend/backend/data/*', 'data')],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          name='otone_client',
          debug=False,
          strip=False,
          upx=True,
          console=True )