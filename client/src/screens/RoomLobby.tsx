/**
 * Lobby (wog-room.md §4): seat-slot list, ready toggle, host-only seat controls, start,
 * consented leave. Driven entirely by the pre-bound room; re-asks with REQUEST_LOBBY_STATE
 * on mount because the join-time broadcast races handler registration.
 */
import { useEffect, useRef, useState } from 'react';
import type { Room } from 'colyseus.js';
import { fr } from '../i18n/fr.js';
import type { LobbyState } from '../net/room.js';

export function RoomLobby({
  room,
  seatId,
  onLeave,
  notice,
}: {
  room: Room;
  seatId: number;
  onLeave: () => void;
  notice: string | null;
}) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [copied, setCopied] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    room.onMessage('LOBBY_STATE', (l: LobbyState) => setLobby(l));
    if (!requested.current) {
      requested.current = true;
      room.send('REQUEST_LOBBY_STATE', {});
    }
  }, [room]);

  if (!lobby) {
    return <div className="centre-plein">{fr.connecting}</div>;
  }

  const mySeat = lobby.seats[seatId];
  const isHost = seatId === lobby.hostSeat;
  const trailingEmpty = lobby.seats.length > 0 && !lobby.seats[lobby.seats.length - 1]!.occupied;
  const occupied = lobby.seats.filter((s) => s.occupied).length;

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${lobby.roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="lobby">
      <header style={{ textAlign: 'center' }}>
        <h1>{fr.appName}</h1>
        <p className="texte-faible">{fr.lobby.code}</p>
        <div className="lobby-code">{lobby.roomCode}</div>
        <button className="btn btn-nu" onClick={() => void copyInvite()}>
          {copied ? fr.lobby.copied : fr.lobby.copyInvite}
        </button>
        {notice && (
          <p className="erreur" role="alert">
            {notice}
          </p>
        )}
      </header>

      <ul className="sieges" aria-label={fr.lobby.players}>
        {lobby.seats.map((seat) => {
          const isMe = seat.seatId === seatId;
          const isHostSeat = seat.seatId === lobby.hostSeat && seat.occupied;
          return (
            <li key={seat.seatId} className={`siege ${seat.occupied ? '' : 'siege-libre'}`}>
              <span className="num">{seat.seatId + 1}</span>
              <span className="nom">
                {seat.occupied ? seat.displayName : fr.lobby.seatEmpty}
                {isHostSeat && <span className="badge"> {fr.lobby.host}</span>}
                {isMe && seat.occupied && <span className="badge"> {fr.lobby.you}</span>}
              </span>
              <span
                className={
                  !seat.occupied ? '' : seat.conn === 'DISCONNECTED' ? 'etat-deco' : seat.ready ? 'etat-pret' : 'texte-faible'
                }
              >
                {seat.occupied
                  ? seat.conn === 'DISCONNECTED'
                    ? fr.lobby.disconnectedSeat
                    : seat.ready
                      ? `✓ ${fr.lobby.ready}`
                      : fr.lobby.notReady
                  : ''}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="texte-faible" style={{ textAlign: 'center' }}>
        {fr.lobby.waiting(occupied, lobby.minSeats)}
      </p>

      <div className="lobby-controles">
        <button
          className={`btn ${mySeat?.ready ? '' : 'btn-primaire'}`}
          onClick={() => room.send('SET_READY', { ready: !mySeat?.ready })}
        >
          {mySeat?.ready ? fr.lobby.cancelReady : fr.lobby.imReady}
        </button>
        {isHost && (
          <>
            <button
              className="btn"
              onClick={() => room.send('ADD_SEAT', {})}
              disabled={lobby.seats.length >= lobby.maxSeats}
            >
              {fr.lobby.addSeat}
            </button>
            <button
              className="btn"
              onClick={() => room.send('REMOVE_SEAT', {})}
              disabled={lobby.seats.length <= lobby.minSeats || !trailingEmpty}
            >
              {fr.lobby.removeSeat}
            </button>
            <button className="btn btn-primaire" onClick={() => room.send('START_MATCH', {})} disabled={!lobby.canStart}>
              {fr.lobby.start}
            </button>
          </>
        )}
        <button className="btn btn-nu" onClick={onLeave}>
          {fr.lobby.leave}
        </button>
      </div>
      {isHost && !lobby.canStart && (
        <p className="texte-faible" style={{ textAlign: 'center' }}>
          {fr.lobby.startHint}
        </p>
      )}
    </div>
  );
}
