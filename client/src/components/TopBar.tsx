/**
 * Platform toolbar — same chrome as the other gosgames tenants (WoG/Pantheons top bar):
 * left = platform link + game title (→ landing), right = account link + sign-out.
 * Shown on the landing page and in the room lobby, never inside the gameroom.
 */
import { fr } from '../i18n/fr.js';
import { clearSession, type Session } from '../auth/handoff.js';
import { clearResume } from '../state/resume.js';
import { navigate } from '../router.js';
import { valueIcon } from '../cards/art.js';

const PLATFORM_HOME = 'https://www.gosgames.com';
const PLATFORM_ACCOUNT = 'https://www.gosgames.com/account';

export function TopBar({ session }: { session: Session }) {
  const signOut = () => {
    // The stored room/seat belongs to the session being ended.
    clearResume();
    clearSession();
    window.location.replace(PLATFORM_HOME);
  };

  return (
    <header className="barre-appli">
      <div className="barre-gauche">
        <a
          className="barre-logo"
          href={PLATFORM_HOME}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={fr.barre.retourPlateforme}
          title={fr.barre.retourPlateforme}
        >
          G
        </a>
        <span className="barre-filet" aria-hidden />
        <button className="barre-titre" onClick={() => navigate('/')}>
          <img src={valueIcon('sabres')} alt="" aria-hidden />
          {fr.appName}
        </button>
      </div>
      <div className="barre-droite">
        <a
          className="barre-compte"
          href={PLATFORM_ACCOUNT}
          target="_blank"
          rel="noopener noreferrer"
          title={fr.barre.monCompte}
        >
          {session.displayName ?? session.userId}
        </a>
        <button className="btn btn-nu barre-sortie" onClick={signOut}>
          {fr.barre.deconnexion}
        </button>
      </div>
    </header>
  );
}
