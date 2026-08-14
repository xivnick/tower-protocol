import { useMemo, type ReactNode, type Ref, type UIEventHandler } from "react";
import type { HuntLogEntry } from "../../api/characterApi";

type CombatLogProps = {
  logs: HuntLogEntry[];
  playerName: string;
  enemyName: string;
  enemyLevel: number;
  gainedExperience?: number;
  gainedCredits?: number;
  victoryMessage?: ReactNode;
  emptyMessage: string;
  ariaLabel?: string;
  listRef?: Ref<HTMLOListElement>;
  onScroll?: UIEventHandler<HTMLOListElement>;
};

export function CombatLog({
  logs,
  playerName,
  enemyName,
  enemyLevel,
  gainedExperience = 0,
  gainedCredits = 0,
  victoryMessage,
  emptyMessage,
  ariaLabel = "전투 로그",
  listRef,
  onScroll,
}: CombatLogProps) {
  const displayedLogs = useMemo(() => groupCombatLogs(withEssenceStatusLogs(logs)), [logs]);

  return (
    <ol className="combat-log" aria-label={ariaLabel} ref={listRef} onScroll={onScroll}>
      {displayedLogs.length > 0 ? displayedLogs.map((log, index) => {
        const entry = log.entries[0];
        const previousEntry = index > 0 ? displayedLogs[index - 1].entries[0] : undefined;
        const isLinkedLog = isLinkedCombatLog(entry, previousEntry);
        return (
          <li className={`is-${log.kind} ${isLinkedLog ? "is-linked" : ""}`} key={`${log.timeTenths}-${log.kind}-${index}`}>
            <time className={getLogTimeTone(entry)} aria-hidden={isLinkedLog}>{isLinkedLog ? "" : `[${formatCombatTime(log.timeTenths)}]`}</time>
            <span>{log.kind === "combined_regeneration"
              ? formatCombinedRegeneration(log.entries)
              : formatLogEntry(entry, playerName, enemyName, enemyLevel, gainedExperience, gainedCredits, victoryMessage)}</span>
          </li>
        );
      }) : <li className="is-empty">{emptyMessage}</li>}
    </ol>
  );
}

function formatLogEntry(
  entry: HuntLogEntry,
  playerName: string,
  enemyName: string,
  enemyLevel: number,
  gainedExperience: number,
  gainedCredits: number,
  victoryMessage?: ReactNode,
): ReactNode {
  const damage = entry.shieldAbsorbed && entry.shieldAbsorbed > 0
    ? <>{<b className="combat-log-shield">-{formatAmount(entry.shieldAbsorbed)} S</b>}{entry.amount > 0 && <> <b className="combat-log-damage">-{formatAmount(entry.amount)} HP</b></>}</>
    : <b className="combat-log-damage">-{formatAmount(entry.amount)} HP</b>;
  const recovery = <b className="combat-log-recovery">+{formatAmount(entry.amount)} HP</b>;
  const essenceUser = entry.source === "enemy" ? enemyName : playerName;
  const essenceName = entry.name ?? "정수";
  const essenceLabel = entry.grade ? `${essenceName} ${formatEssenceGrade(entry.grade)}` : essenceName;
  const essenceSourceClass = entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player";
  if (entry.kind === "encounter") return `LV.${enemyLevel} ${enemyName}${withAnd(enemyName)} 조우했습니다.`;
  if (entry.kind === "defeat") return victoryMessage ?? `전투 승리 · +${gainedExperience} EXP · +${gainedCredits} CR`;
  if (entry.kind === "player_defeat") return "전투에서 패배했습니다.";
  if (entry.kind === "fled") return "전투에서 도망쳤습니다.";
  if (entry.kind === "timeout") return "시간 초과 · 전투 종료";
  if (entry.kind === "essence_cast") return <><b className={entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{essenceUser}</b> · <b className="combat-log-essence-cast">{essenceLabel}</b></>;
  if (entry.kind === "essence_status") {
    if (entry.timeTenths === 0 && entry.parentSequence === undefined) {
      return <><b className={essenceSourceClass}>{essenceUser}</b> · <b className="combat-log-essence-cast">{essenceLabel}</b></>;
    }
    return <><b className={essenceSourceClass}>{essenceName}</b> {entry.effect ?? "효과 준비"}</>;
  }
  if (entry.kind === "essence_damage") return formatTargetedEssenceEffect(entry, essenceName, entry.effect ?? "피해", damage);
  if (entry.kind === "essence_dot") return formatTargetedEssenceEffect(entry, essenceName, "독 피해", damage);
  if (entry.kind === "essence_heal") return <><b className={essenceSourceClass}>{essenceName}</b> 회복 <i className={`combat-log-arrow ${entry.source === "enemy" ? "is-enemy" : "is-player"}`}>≫</i> {recovery}</>;
  if (entry.kind === "essence_shield") return <><b className={essenceSourceClass}>{essenceName}</b> 방어막 <i className={`combat-log-arrow ${entry.source === "enemy" ? "is-enemy" : "is-player"}`}>≫</i> <b className="combat-log-shield">+{formatAmount(entry.amount)} S</b></>;
  if (entry.kind === "shield_absorb") return <><b className={entry.target === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{entry.target === "enemy" ? enemyName : playerName}</b> 방어막 흡수 <b className="combat-log-shield">-{formatAmount(entry.amount)} S</b></>;
  if (entry.kind === "essence_extra_hit") return formatTargetedEssenceEffect(entry, essenceName, "추가타", damage);
  if (entry.kind === "essence_reflect") return formatTargetedEssenceEffect(entry, essenceName, "반격", damage);
  if (entry.kind === "miss") return <><b className="combat-log-player">{playerName}</b> 공격이 빗나갔습니다.</>;
  if (entry.kind === "enemy_miss") return <><b className="combat-log-enemy">{enemyName}</b> 공격을 <b className="combat-log-evasion">회피</b>했습니다.</>;
  if (entry.kind === "regeneration") return <><b className="combat-log-enemy">{enemyName}</b> 재생 {recovery}</>;
  if (entry.kind === "player_regeneration") return <><b className="combat-log-player">{playerName}</b> 재생 {recovery}</>;
  if (entry.kind === "enemy_attack") return <><b className="combat-log-enemy">{enemyName}</b> 공격 <i className="combat-log-arrow is-enemy">≫</i> {damage}</>;
  if (entry.kind === "enemy_critical") return <><b className="combat-log-enemy">{enemyName}</b> <b className="combat-log-critical">치명타</b> <i className="combat-log-arrow is-enemy">≫</i> {damage}</>;
  if (entry.kind === "reflect") return <><b className="combat-log-player">{playerName}</b> 반사 피해 <i className="combat-log-arrow is-player">≫</i> {damage}</>;
  if (entry.kind === "critical") return <><b className="combat-log-player">{playerName}</b> <b className="combat-log-critical">치명타</b> <i className="combat-log-arrow is-player">≫</i> {damage}</>;
  return <><b className="combat-log-player">{playerName}</b> 공격 <i className="combat-log-arrow is-player">≫</i> {damage}</>;
}

function getLogTimeTone(entry: HuntLogEntry) {
  if (entry.kind === "enemy_attack" || entry.kind === "enemy_critical" || entry.kind === "enemy_miss" || (entry.kind.startsWith("essence_") && entry.source === "enemy")) return "is-enemy-action";
  if (entry.kind === "attack" || entry.kind === "critical" || entry.kind === "miss" || entry.kind === "reflect" || (entry.kind.startsWith("essence_") && entry.source === "player")) return "is-player-action";
  return "";
}

function groupCombatLogs(logs: HuntLogEntry[]) {
  const groups: Array<{ kind: HuntLogEntry["kind"] | "combined_regeneration"; timeTenths: number; entries: HuntLogEntry[] }> = [];
  const orderedLogs = orderCombatLogs(logs);

  for (const entry of orderedLogs) {
    const previous = groups[groups.length - 1];
    const isRegeneration = entry.kind === "regeneration" || entry.kind === "player_regeneration";
    if (isRegeneration && previous?.kind === "combined_regeneration" && previous.timeTenths === entry.timeTenths) {
      previous.entries.push(entry);
      continue;
    }
    groups.push({ kind: isRegeneration ? "combined_regeneration" : entry.kind, timeTenths: entry.timeTenths, entries: [entry] });
  }
  return groups;
}

function withEssenceStatusLogs(logs: HuntLogEntry[]) {
  const result: HuntLogEntry[] = [];
  for (const entry of logs) {
    result.push(entry);
    if (entry.kind !== "essence_cast") continue;
    const effect = getEssenceStatusEffect(entry.name);
    if (!effect) continue;
    result.push({
      ...entry,
      kind: "essence_status",
      amount: 0,
      effect,
      sequence: entry.sequence === undefined ? undefined : entry.sequence + 0.001,
      parentSequence: entry.sequence,
    });
  }
  return result;
}

function getEssenceStatusEffect(name?: string) {
  if (!name) return "";
  if (name.includes("분노한 멧돼지")) return "일반공격 강화";
  if (name.includes("숲 늑대")) return "일반공격 추가타";
  if (name.includes("붉은가시 맹수")) return "가시 상태";
  if (name.includes("칼날 딱정벌레")) return "출혈 준비";
  if (name.includes("수정 도마뱀")) return "마법 추가피해";
  return "";
}

function orderCombatLogs(logs: HuntLogEntry[]) {
  if (logs.some((entry) => entry.sequence !== undefined)) return logs;

  const ordered: HuntLogEntry[] = [];
  let tickEntries: HuntLogEntry[] = [];

  for (const entry of logs) {
    if (tickEntries.length > 0 && tickEntries[0].timeTenths !== entry.timeTenths) {
      ordered.push(...orderCombatLogTick(tickEntries));
      tickEntries = [];
    }
    tickEntries.push(entry);
  }

  if (tickEntries.length > 0) ordered.push(...orderCombatLogTick(tickEntries));
  return ordered;
}

function orderCombatLogTick(entries: HuntLogEntry[]) {
  const ordered: HuntLogEntry[] = [];
  const pendingShieldAbsorbs: HuntLogEntry[] = [];
  const pendingEssenceHeals: HuntLogEntry[] = [];
  const deferredDefeats: HuntLogEntry[] = [];

  for (const entry of entries) {
    if (entry.kind === "shield_absorb") {
      pendingShieldAbsorbs.push(entry);
      continue;
    }
    if (entry.kind === "essence_heal") {
      pendingEssenceHeals.push(entry);
      continue;
    }
    if (entry.kind === "defeat" || entry.kind === "player_defeat") {
      deferredDefeats.push(entry);
      continue;
    }

    ordered.push(entry);
    if (entry.kind === "essence_damage") {
      for (let index = pendingEssenceHeals.length - 1; index >= 0; index -= 1) {
        const essenceHeal = pendingEssenceHeals[index];
        if (essenceHeal.source !== entry.source) continue;
        ordered.push(essenceHeal);
        pendingEssenceHeals.splice(index, 1);
      }
    }
    if (!isDamageLog(entry)) continue;

    for (let index = pendingShieldAbsorbs.length - 1; index >= 0; index -= 1) {
      const shieldAbsorb = pendingShieldAbsorbs[index];
      if (shieldAbsorb.target !== entry.target) continue;
      ordered.push(shieldAbsorb);
      pendingShieldAbsorbs.splice(index, 1);
    }
  }

  return [...ordered, ...pendingEssenceHeals, ...pendingShieldAbsorbs, ...deferredDefeats];
}

function isDamageLog(entry: HuntLogEntry) {
  return entry.kind === "attack" || entry.kind === "critical" || entry.kind === "enemy_attack" || entry.kind === "enemy_critical"
    || entry.kind === "essence_damage" || entry.kind === "essence_dot" || entry.kind === "essence_extra_hit" || entry.kind === "reflect" || entry.kind === "essence_reflect";
}

function formatCombinedRegeneration(entries: HuntLogEntry[]): ReactNode {
  const player = entries.find((entry) => entry.kind === "player_regeneration");
  const enemy = entries.find((entry) => entry.kind === "regeneration");
  return <>
    재생 <i className="combat-log-arrow is-player">≫</i>
    {player && <> <b className="combat-log-recovery">+{formatAmount(player.amount)} HP</b></>}
    {enemy && <> <i className="combat-log-arrow is-enemy">≫</i> <b className="combat-log-recovery">+{formatAmount(enemy.amount)} HP</b></>}
  </>;
}

export function formatCombatTime(tenths: number) {
  return `${(tenths / 10).toFixed(1)}s`;
}

export function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function withAnd(word: string) {
  const finalCode = word.charCodeAt(word.length - 1);
  const hasFinalConsonant = finalCode >= 0xac00 && finalCode <= 0xd7a3 && (finalCode - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? "과" : "와";
}

export function formatEssenceGrade(grade: number) {
  return ["", "I", "II", "III", "IV", "V"][grade] ?? `${grade}`;
}

function isLinkedCombatLog(entry: HuntLogEntry, previousEntry?: HuntLogEntry) {
  if (entry.parentSequence !== undefined || entry.sequence !== undefined) {
    if (entry.parentSequence !== undefined) {
      return entry.parentSequence === previousEntry?.sequence || entry.parentSequence === previousEntry?.parentSequence;
    }
    return entry.kind !== "essence_status" && isEssenceFollowUp(entry) && (previousEntry?.kind === "essence_cast" || isEssenceFollowUp(previousEntry)) && entry.source === previousEntry?.source;
  }

  return isEssenceFollowUp(entry) || entry.kind === "reflect";
}

function isEssenceFollowUp(entry?: HuntLogEntry) {
  if (!entry) return false;
  return entry.kind === "essence_damage" || entry.kind === "essence_heal" || entry.kind === "essence_shield"
    || entry.kind === "shield_absorb" || entry.kind === "essence_extra_hit" || entry.kind === "essence_reflect" || entry.kind === "essence_status";
}

function formatTargetedEssenceEffect(entry: HuntLogEntry, essenceName: string, action: string, result: ReactNode) {
  const sourceClass = entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player";
  const arrowClass = entry.source === "enemy" ? "is-enemy" : "is-player";
  return <><b className={sourceClass}>{essenceName}</b> {action} <i className={`combat-log-arrow ${arrowClass}`}>≫</i> {result}</>;
}
