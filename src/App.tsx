import { useEffect, useRef, useState } from 'react';
import { Game } from './game/Game';
import { formatTime, initialCounts, TOTAL_TIME, xpThreshold } from './game/progression';
import type { Snapshot, UpgradeId } from './game/types';

const INITIAL: Snapshot = {
  phase: 'menu', elapsed: 0, totalTime: TOTAL_TIME, health: 100, maxHealth: 100,
  level: 1, xp: 0, xpToNext: xpThreshold(1), kills: 0, energy: 0,
  resonanceLeft: 0, storm: false, upgrades: [], counts: initialCounts(),
  bossAlive: false, bossHealth: 0, bossMaxHealth: 0, dashCooldown: 0, soundEnabled: true, banner: '', best: 0,
};

function Meter({ value, maximum, variant = 'cyan' }: { value: number; maximum: number; variant?: string }) {
  return (
    <div className={'meter meter--' + variant} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={maximum}>
      <div className="meter__fill" style={{ width: (Math.min(100, Math.max(0, value / Math.max(maximum, 1) * 100))) + '%' }} />
    </div>
  );
}

function Key({ children }: { children: string }) {
  return <kbd className="key">{children}</kbd>;
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand__mark" aria-hidden="true"><span>✦</span></div>
      <div className="brand__lockup"><strong>SHINOBI</strong><span>SURVIVORS</span></div>
    </div>
  );
}

export function App() {
  const mount = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [state, setState] = useState<Snapshot>(INITIAL);
  const [toast, setToast] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mount.current) return;
    let instance: Game | null = null;
    try {
      instance = new Game(mount.current);
      game.current = instance;
      instance.subscribe(setState);
    } catch (cause) {
      setError('Não foi possível iniciar o renderizador 3D. Atualize seu navegador e verifique se a aceleração de hardware está ativada.');
      console.error('[Shinobi Survivors] WebGL initialization failed:', cause);
    }
    return () => {
      game.current = null;
      instance?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!state.banner) return;
    setToast(state.banner);
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [state.banner]);

  const start = () => game.current?.start();
  const upgrade = (id: UpgradeId) => game.current?.chooseUpgrade(id);
  const health = state.health / Math.max(1, state.maxHealth);
  const playing = state.phase === 'playing';
  const isOverlay = ['menu', 'paused', 'levelup', 'victory', 'defeat'].includes(state.phase);

  return (
    <div className="app">
      <div ref={mount} className="world" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      {state.phase === "playing" && state.health / Math.max(1, state.maxHealth) < 0.27 && <div className="critical-health" aria-hidden="true" />}
      {error && <div className="error-state"><h2>WebGL indisponível</h2><p>{error}</p></div>}

      {!error && state.phase !== 'menu' && (
        <>
          <div className="hud hud--top">
            <div className="hud__identity">
              <Brand />
              <div className="hud__identity-sub"><span className="live-dot" /> PROVAÇÃO: VALE DO VÉU</div>
            </div>
            <div className="timer-panel">
              <span className="eyebrow">TEMPO DE SOBREVIVÊNCIA</span>
              <div className="timer">{formatTime(state.elapsed)} <span>/ {formatTime(state.totalTime)}</span></div>
              <Meter value={state.elapsed} maximum={state.totalTime} variant="gold" />
            </div>
            <div className="hud__stats">
              <div><span className="eyebrow">NÍVEL</span><strong>{String(state.level).padStart(2, '0')}</strong></div>
              <div><span className="eyebrow">ELIMINAÇÕES</span><strong>{String(state.kills).padStart(3, '0')}</strong></div>
              <button className="icon-button" title={state.soundEnabled ? "Silenciar efeitos sonoros (M)" : "Ativar efeitos sonoros (M)"} onClick={() => game.current?.toggleAudio()} aria-label={state.soundEnabled ? "Desativar som" : "Ativar som"}>{state.soundEnabled ? "◖))" : "◖)"}</button>
              <button className="icon-button" title="Pausar jogo (Esc)" onClick={() => game.current?.togglePause()} aria-label="Pausar ou continuar">
                {state.phase === 'paused' ? '▶' : 'Ⅱ'}
              </button>
            </div>
          </div>

          <div className="hud hud--bottom">
            <div className="character-panel">
              <div className="avatar">AS</div>
              <div className="character-panel__meters">
                <div className="bar-label"><span>AYA SEN <em>• Dançarina da Ventania</em></span><span>{Math.ceil(state.health)} / {state.maxHealth}</span></div>
                <Meter value={state.health} maximum={state.maxHealth} variant={health < 0.3 ? 'danger' : 'health'} />
                <div className="bar-label bar-label--small"><span>EXPERIÊNCIA</span><span>{state.xp} / {state.xpToNext}</span></div>
                <Meter value={state.xp} maximum={state.xpToNext} />
              </div>
            </div>
            <div className="arts-panel">
              <span className="eyebrow">ARTES EQUIPADAS</span>
              <div className="arts-panel__slots">
                <div className="art-slot art-slot--active"><span>✦</span><small>VENTO</small></div>
                <div className={'art-slot ' + (state.counts.echo ? 'art-slot--active' : '')}><span>◈</span><small>ECOS</small></div>
                <div className={'art-slot ' + (state.storm ? 'art-slot--active art-slot--storm' : '')}><span>✧</span><small>TRAMA</small></div>
                <div className="art-slot art-slot--locked"><span>＋</span><small>EM BREVE</small></div>
              </div>
            </div>
            <button
              className={'resonance-panel ' + (state.energy >= 100 ? 'resonance-panel--ready' : '')}
              onClick={() => game.current?.activateResonance()}
              disabled={!playing || state.energy < 100}
              title="Ativar Ressonância (R)"
            >
              <div className="resonance-panel__icon">✹</div>
              <div className="resonance-panel__content">
                <span className="eyebrow">RESSONÂNCIA <Key>R</Key></span>
                <strong>{state.resonanceLeft > 0 ? 'ATIVADA' : state.energy >= 100 ? 'PRONTA PARA ATIVAR' : 'OLHO DA TEMPESTADE'}</strong>
                <Meter value={state.resonanceLeft > 0 ? state.resonanceLeft : state.energy} maximum={state.resonanceLeft > 0 ? 9 : 100} variant="gold" />
              </div>
            </button>
          </div>
          {state.bossAlive && state.phase === 'playing' && <div className="boss-warning"><span>⚔ SENTINELA PARTIDA — O GUARDIÃO DESPERTA</span><Meter value={state.bossHealth} maximum={state.bossMaxHealth} variant="danger" /></div>}
          {playing && toast && <div key={toast} className="battle-toast">{toast}</div>}
          {playing && <div className="micro-help">WASD mover <span>·</span> <Key>SHIFT</Key> {state.dashCooldown > 0 ? "esquiva " + state.dashCooldown.toFixed(1) + "s" : "esquiva pronta"} <span>·</span> <Key>M</Key> som <span>·</span> mouse direito girar câmera</div>}
        </>
      )}

      {!error && isOverlay && <div className="overlay-scrim" />}

      {!error && state.phase === 'menu' && (
        <main className="menu-screen">
          <div className="menu-screen__top">
            <Brand />
            <div className="menu-actions"><button className="menu-audio" onClick={() => game.current?.toggleAudio()}>{state.soundEnabled ? "◖)) SOM LIGADO" : "◖) SOM DESLIGADO"}</button><span className="build-pill"><span className="live-dot" /> COMBAT UPDATE <b>0.2.0</b></span></div>
          </div>
          <div className="menu-screen__content">
            <section className="hero-copy">
              <div className="chapter"><span className="chapter__line" /> CAPÍTULO I <span>— A RUPTURA DO VÉU</span></div>
              <h1>DOMINE<br />AS <em>ARTES.</em><br /><span>SOBREVIVA.</span></h1>
              <p>O Véu foi rompido. Criaturas do vazio invadem o último bastião. Desperte suas Artes, construa combinações devastadoras e prove que sua vontade é mais forte que a escuridão.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={start}><span>INICIAR PROVAÇÃO</span><span aria-hidden="true">↗</span></button>
                <div className="hero-actions__meta"><span>✦</span> JOGUE AGORA <span className="separator">/</span> 100% GRATUITO</div>
              </div>
              <div className="game-tags"><span>COMBATE 3D</span><span>ROGUELITE</span><span>ARTES ELEMENTAIS</span><span>1 JOGADOR</span></div>
            </section>
            <aside className="menu-card">
              <div className="menu-card__top"><span>PROVAÇÃO Nº 001</span><span>◈</span></div>
              <div className="menu-card__glyph">✦</div>
              <div className="menu-card__line" />
              <span className="eyebrow">PERSONAGEM INICIAL</span>
              <h2>AYA <span>SEN</span></h2>
              <p>A Dançarina da Ventania domina as correntes invisíveis do Fluxo. Sua velocidade é sua maior arma.</p>
              <div className="menu-card__traits"><span>✧ VENTO</span><span>◈ MOBILIDADE</span><span>✹ RESSONÂNCIA</span></div>
              <div className="menu-card__footer"><span>DURAÇÃO DA PROVAÇÃO</span><strong>04:00</strong></div>
            </aside>
          </div>
          <div className="menu-screen__footer">
            <span>SHINOBI SURVIVORS © 2026 · UNIVERSO ORIGINAL</span>
            <span>WASD <b>MOVER</b> <i>·</i> SHIFT <b>ESQUIVAR</b> <i>·</i> R <b>RESSONÂNCIA</b></span>
          </div>
        </main>
      )}

      {!error && state.phase === 'paused' && (
        <section className="modal modal--small" aria-label="Jogo pausado">
          <span className="eyebrow">PROVAÇÃO INTERROMPIDA</span>
          <h2>PAUSA<span className="accent">.</span></h2>
          <p>Respire. O Véu permanecerá onde está até você voltar.</p>
          <button className="primary-button" onClick={() => game.current?.togglePause()}><span>CONTINUAR</span><span>↗</span></button>
          <button className="quiet-button" onClick={start}>REINICIAR PROVAÇÃO</button>
          <div className="controls-list"><span>WASD · MOVIMENTO</span><span>SHIFT / ESPAÇO · ESQUIVA</span><span>R · RESSONÂNCIA</span><span>M · SOM</span></div>
        </section>
      )}

      {!error && state.phase === 'levelup' && (
        <section className="upgrade-modal" aria-labelledby="upgrade-title">
          <div className="upgrade-heading">
            <span className="eyebrow">SEU FLUXO ESTÁ EVOLUINDO</span>
            <h2 id="upgrade-title">ESCOLHA SUA <em>ARTE.</em></h2>
            <p>NÍVEL {state.level} <span>✦</span> SELECIONE UM APERFEIÇOAMENTO</p>
          </div>
          <div className="upgrade-grid">
            {state.upgrades.map((item, index) => (
              <button className="upgrade-card" key={item.id} onClick={() => upgrade(item.id)}>
                <div className="upgrade-card__top"><span>0{index + 1}</span><span>◈</span></div>
                <div className="upgrade-card__icon">{item.icon}</div>
                <span className="eyebrow">{item.category}</span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <div className="upgrade-card__bottom"><span>SELECIONAR ARTE</span><span>↗</span></div>
              </button>
            ))}
          </div>
          {state.counts.wind > 0 && <div className="upgrade-hint">DICA: combine <strong>Fio de Vendaval II</strong> + <strong>Eco Errante I</strong> para despertar uma Trama.</div>}
        </section>
      )}

      {!error && (state.phase === 'victory' || state.phase === 'defeat') && (
        <section className="modal result-modal">
          <span className="eyebrow">{state.phase === 'victory' ? 'O VÉU RECUOU' : 'A PROVAÇÃO TERMINOU'}</span>
          <div className="result-symbol">{state.phase === 'victory' ? '✹' : '✦'}</div>
          <h2>{state.phase === 'victory' ? 'VITÓRIA' : 'FIM DA' }<span className="accent"> {state.phase === 'victory' ? '.' : 'PROVAÇÃO.'}</span></h2>
          <p>{state.phase === 'victory' ? 'Sua vontade resistiu à ruptura.' : 'Toda derrota ensina uma nova Arte. Levante-se novamente.'}</p>
          <div className="result-stats">
            <div><span>TEMPO</span><strong>{formatTime(state.elapsed)}</strong></div>
            <div><span>ELIMINAÇÕES</span><strong>{state.kills}</strong></div>
            <div><span>MELHOR MARCA</span><strong>{state.best}</strong></div>
          </div>
          <button className="primary-button" onClick={start}><span>JOGAR NOVAMENTE</span><span>↗</span></button>
        </section>
      )}
    </div>
  );
}
