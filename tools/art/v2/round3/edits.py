import glob, os, subprocess
HL = os.path.expanduser('~/git-projects/homelab')
ref = os.path.abspath(glob.glob('r2/gen/fantome_a/s21938/*.png')[0])
pr = 'Keep this exact ship, composition, ink style and paper. Make it a haunted ghost ship: the sails torn to rags full of holes, the masts cracked, a few skeleton sailors at the rails, an eerie plum violet glow from inside the hull, violet spectral mist pouring from the ship and trailing behind, the hull half see-through. No text.'
for i in range(3):
    seed = 5200 + 31 * i; d = f'r3/gen/e_fantome/s{seed}'
    if glob.glob(d + '/*.png'): continue
    os.makedirs(d, exist_ok=True)
    r = subprocess.run([f'{HL}/scripts/imagegen', 'run', '--workflow', 'flux2-klein-4b-edit', '--image', ref, '--prompt', pr, '--seed', str(seed),
                        '--width', '1024', '--height', '1440', '--out', os.path.abspath(d)], cwd=HL, capture_output=True, text=True)
    print('e_fantome', seed, r.returncode, r.stderr[-200:] if r.returncode else '', flush=True)
print('EDITSDONE', flush=True)
