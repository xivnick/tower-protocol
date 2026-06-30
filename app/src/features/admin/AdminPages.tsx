import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  grantAdminCharacterCredits,
  grantAdminCharacterExperience,
  loadAdminAuditLogs,
  loadAdminBalanceCatalog,
  loadAdminContentStatus,
  loadAdminPlayerDetail,
  resetAdminPlayerHuntState,
  searchAdminPlayers,
  type AdminAuditLog,
  type AdminBalanceCatalog,
  type AdminContentStatus,
  type AdminPlayerDetail,
  type AdminPlayerSearchRow,
} from "../../api/adminApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";

type LoadState<TData> =
  | { status: "loading"; data: null; message: string }
  | { status: "ready"; data: TData; message: "" }
  | { status: "error"; data: null; message: string };

export function AdminPlayersScreen() {
  useDocumentTitle("TOWER://ADMIN_PLAYERS");

  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<LoadState<AdminPlayerSearchRow[]>>({ status: "loading", data: null, message: "플레이어 목록을 불러오는 중..." });
  const detail = useAdminPlayerDetail(selectedUserId);

  useEffect(() => {
    let isActive = true;
    void searchAdminPlayers("").then((result) => {
      if (!isActive) return;
      if (!result.ok) {
        setRows({ status: "error", data: null, message: result.message });
        return;
      }
      setRows({ status: "ready", data: result.data, message: "" });
      setSelectedUserId(result.data[0]?.user_id ?? null);
    });
    return () => { isActive = false; };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRows({ status: "loading", data: null, message: "플레이어를 검색하는 중..." });
    void searchAdminPlayers(query).then((result) => {
      if (!result.ok) {
        setRows({ status: "error", data: null, message: result.message });
        return;
      }
      setRows({ status: "ready", data: result.data, message: "" });
      setSelectedUserId(result.data[0]?.user_id ?? null);
    });
  }

  return (
    <section className="admin-view">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">PLAYERS</span>
          <h1>플레이어 조회</h1>
        </div>
      </div>

      <form className="admin-search" onSubmit={handleSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이메일, 닉네임, 캐릭터명, UUID" />
        <button className="btn primary" type="submit">검색</button>
      </form>

      <div className="admin-split">
        <article className="panel">
          <div className="panel-head">
            <span>RESULTS</span>
            <h2>검색 결과</h2>
          </div>
          {rows.status !== "ready" ? (
            <p className={`panel-message ${rows.status === "error" ? "is-error" : ""}`}>{rows.message}</p>
          ) : (
            <PlayerResultTable rows={rows.data} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />
          )}
        </article>

        <PlayerDetailPanel detail={detail} />
      </div>
    </section>
  );
}

export function AdminSupportScreen() {
  useDocumentTitle("TOWER://ADMIN_SUPPORT");

  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<AdminPlayerSearchRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get("user"));
  const [reason, setReason] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("100");
  const [experienceAmount, setExperienceAmount] = useState("100");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const detail = useAdminPlayerDetail(selectedUserId, detailRefreshKey);
  const selectedCharacterId = detail.status === "ready" ? detail.data.character?.id ?? null : null;

  useEffect(() => {
    const userId = searchParams.get("user");
    if (!userId) return;
    setSelectedUserId(userId);
  }, [searchParams]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    void searchAdminPlayers(query).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setPlayers(result.data);
      setSelectedUserId(result.data[0]?.user_id ?? null);
    });
  }

  function handleResetHunt() {
    if (!selectedCharacterId) return;
    setIsSubmitting(true);
    setMessage("");
    void resetAdminPlayerHuntState(selectedCharacterId, reason).then((result) => {
      setIsSubmitting(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setReason("");
      setMessage("사냥 상태를 초기화했습니다.");
    });
  }

  function handleGrantCredits() {
    if (!selectedCharacterId) return;
    handleGrant(() => grantAdminCharacterCredits(selectedCharacterId, toPositiveInteger(creditsAmount), reason), "크레딧을 지급했습니다.");
  }

  function handleGrantExperience() {
    if (!selectedCharacterId) return;
    handleGrant(() => grantAdminCharacterExperience(selectedCharacterId, toPositiveInteger(experienceAmount), reason), "경험치를 지급했습니다.");
  }

  function handleGrant(action: () => ReturnType<typeof grantAdminCharacterCredits>, successMessage: string) {
    setIsSubmitting(true);
    setMessage("");
    void action().then((result) => {
      setIsSubmitting(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(successMessage);
      setDetailRefreshKey((current) => current + 1);
    });
  }

  return (
    <section className="admin-view">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>플레이어 지원</h1>
        </div>
      </div>

      <div className="admin-grid">
        <article className="panel">
          <div className="panel-head">
            <span>SEARCH</span>
            <h2>대상 선택</h2>
          </div>
          <form className="admin-search" onSubmit={handleSearch}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="플레이어 검색" />
            <button className="btn primary" type="submit">검색</button>
          </form>
          <PlayerResultTable rows={players} selectedUserId={selectedUserId} onSelect={setSelectedUserId} compact />
        </article>

        <article className="panel">
          <div className="panel-head">
            <span>ACTION</span>
            <h2>지원 작업</h2>
          </div>
          <textarea className="admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="처리 사유" rows={4} />
          <div className="admin-grant-grid">
            <label>
              <span>크레딧</span>
              <input value={creditsAmount} onChange={(event) => setCreditsAmount(event.target.value)} inputMode="numeric" />
            </label>
            <button className="btn ghost" type="button" disabled={!selectedCharacterId || isSubmitting} onClick={handleGrantCredits}>
              크레딧 지급
            </button>
            <label>
              <span>경험치</span>
              <input value={experienceAmount} onChange={(event) => setExperienceAmount(event.target.value)} inputMode="numeric" />
            </label>
            <button className="btn ghost" type="button" disabled={!selectedCharacterId || isSubmitting} onClick={handleGrantExperience}>
              경험치 지급
            </button>
            <button className="btn danger admin-wide-action" type="button" disabled={!selectedCharacterId || isSubmitting} onClick={handleResetHunt}>
              {isSubmitting ? "처리 중..." : "사냥 상태 초기화"}
            </button>
          </div>
          {message && <p className={`panel-message ${message.includes("했습니다") ? "" : "is-error"}`}>{message}</p>}
        </article>
      </div>

      <PlayerDetailPanel detail={detail} />
    </section>
  );
}

function PlayerResultTable({
  rows,
  selectedUserId,
  onSelect,
  compact = false,
}: {
  rows: AdminPlayerSearchRow[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="panel-message">결과가 없습니다.</p>;
  }

  return (
    <div className={`admin-player-table ${compact ? "is-compact" : ""}`} role="table" aria-label="플레이어 검색 결과">
      <div className="admin-player-table-head" role="row">
        <span>플레이어</span>
        <span>캐릭터</span>
        {!compact && <span>재화</span>}
        <span>작업</span>
      </div>
      {rows.map((row) => (
        <div className={`admin-player-row ${row.user_id === selectedUserId ? "is-active" : ""}`} role="row" key={row.user_id}>
          <button type="button" onClick={() => onSelect(row.user_id)}>
            <strong>{row.nickname ?? row.email ?? "UNKNOWN"}</strong>
            <small>{row.email ?? row.user_id}</small>
          </button>
          <button type="button" onClick={() => onSelect(row.user_id)}>
            <strong>{row.character_name ?? "없음"}</strong>
            <small>{row.level ? `LV.${row.level} / EXP ${row.experience?.toLocaleString() ?? 0}` : "-"}</small>
          </button>
          {!compact && (
            <button type="button" onClick={() => onSelect(row.user_id)}>
              <strong>{row.credits?.toLocaleString() ?? "-"}</strong>
              <small>CR</small>
            </button>
          )}
          <Link className="btn ghost" to={`/admin/support?user=${row.user_id}`}>
            지원
          </Link>
        </div>
      ))}
    </div>
  );
}

export function AdminBalanceScreen() {
  useDocumentTitle("TOWER://ADMIN_BALANCE");
  const state = useLoader(loadAdminBalanceCatalog, "밸런스 데이터를 불러오는 중...");

  return (
    <AdminDataPage title="밸런스 조회" label="BALANCE" state={state}>
      {(data) => (
        <div className="admin-grid">
          <CatalogPanel title="사냥터" label="HUNT GROUNDS" rows={data.hunt_grounds.map((ground) => ({
            key: ground.id,
            title: ground.name,
            meta: `${ground.recommended_min_level}-${ground.recommended_max_level}F`,
            tag: ground.is_enabled ? "ON" : "OFF",
          }))} />
          <CatalogPanel title="몬스터" label="MONSTERS" rows={data.monsters.map((monster) => ({
            key: monster.id,
            title: monster.name,
            meta: monster.code,
            tag: `x${monster.experience_multiplier}`,
          }))} />
          <CatalogPanel title="정수" label="ESSENCES" rows={data.essences.map((essence) => ({
            key: essence.id,
            title: essence.name,
            meta: essence.code,
            tag: essence.monster_name ?? "-",
          }))} />
        </div>
      )}
    </AdminDataPage>
  );
}

export function AdminContentScreen() {
  useDocumentTitle("TOWER://ADMIN_CONTENT");
  const state = useLoader(loadAdminContentStatus, "콘텐츠 상태를 불러오는 중...");

  return (
    <AdminDataPage title="콘텐츠 관리" label="CONTENT" state={state}>
      {(data) => (
        <article className="panel">
          <div className="panel-head">
            <span>PATCH NOTES</span>
            <h2>패치노트</h2>
          </div>
          <ul className="admin-row-list" aria-label="패치노트">
            {data.patch_notes.map((note) => (
              <li key={note.id}>
                <div>
                  <strong>v{note.version} {note.title}</strong>
                  <span>{note.release_date}</span>
                </div>
                <em>{note.is_published ? "공개" : "초안"}</em>
              </li>
            ))}
          </ul>
        </article>
      )}
    </AdminDataPage>
  );
}

export function AdminAuditScreen() {
  useDocumentTitle("TOWER://ADMIN_AUDIT");
  const state = useLoader(loadAdminAuditLogs, "감사 로그를 불러오는 중...");

  return (
    <AdminDataPage title="감사 로그" label="AUDIT" state={state}>
      {(logs) => (
        <article className="panel">
          <div className="panel-head">
            <span>AUDIT</span>
            <h2>최근 작업</h2>
          </div>
          <ul className="admin-row-list" aria-label="감사 로그">
            {logs.length === 0 ? <li><strong>기록 없음</strong><span>-</span></li> : logs.map((log) => (
              <li key={log.id}>
                <div>
                  <strong>{log.action}</strong>
                  <span>{log.actor_email ?? log.actor_user_id ?? "unknown"} · {log.reason ?? "-"}</span>
                </div>
                <em>{formatDateTime(log.created_at)}</em>
              </li>
            ))}
          </ul>
        </article>
      )}
    </AdminDataPage>
  );
}

function PlayerDetailPanel({ detail }: { detail: LoadState<AdminPlayerDetail> }) {
  if (detail.status !== "ready") {
    return (
      <article className="panel">
        <div className="panel-head">
          <span>DETAIL</span>
          <h2>상세</h2>
        </div>
        <p className={`panel-message ${detail.status === "error" ? "is-error" : ""}`}>{detail.message}</p>
      </article>
    );
  }

  const { data } = detail;

  return (
    <article className="panel">
      <div className="panel-head">
        <span>DETAIL</span>
        <h2>{data.character?.name ?? data.profile?.nickname ?? data.user.email ?? "유저"}</h2>
      </div>
      <div className="kv-grid">
        <Kv label="이메일" value={data.user.email ?? "-"} />
        <Kv label="닉네임" value={data.profile?.nickname ?? "-"} />
        <Kv label="캐릭터" value={data.character ? `LV.${data.character.level} ${data.character.name}` : "없음"} />
        <Kv label="크레딧" value={data.character ? `${data.character.credits.toLocaleString()} CR` : "-"} />
        <Kv label="사냥" value={data.hunt_state?.last_battle_status ?? "대기"} />
        <Kv label="보유" value={`${data.inventory.weapons}W / ${data.inventory.armors}A / ${data.inventory.essences}E`} />
        <Kv label="user_id" value={data.user.id} />
        <Kv label="character_id" value={data.character?.id ?? "-"} />
      </div>
    </article>
  );
}

function AdminDataPage<TData>({
  title,
  label,
  state,
  children,
}: {
  title: string;
  label: string;
  state: LoadState<TData>;
  children: (data: TData) => ReactNode;
}) {
  return (
    <section className="admin-view">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">{label}</span>
          <h1>{title}</h1>
        </div>
      </div>
      {state.status !== "ready"
        ? <p className={`panel-message ${state.status === "error" ? "is-error" : ""}`}>{state.message}</p>
        : children(state.data)}
    </section>
  );
}

function CatalogPanel({ title, label, rows }: { title: string; label: string; rows: Array<{ key: string; title: string; meta: string; tag: string }> }) {
  return (
    <article className="panel admin-console-panel">
      <div className="panel-head">
        <span>{label}</span>
        <h2>{title}</h2>
      </div>
      <ul className="admin-row-list" aria-label={title}>
        {rows.map((row) => (
          <li key={row.key}>
            <div>
              <strong>{row.title}</strong>
              <span>{row.meta}</span>
            </div>
            <em>{row.tag}</em>
          </li>
        ))}
      </ul>
    </article>
  );
}

function useAdminPlayerDetail(userId: string | null, refreshKey = 0): LoadState<AdminPlayerDetail> {
  const [state, setState] = useState<LoadState<AdminPlayerDetail>>({ status: "loading", data: null, message: "플레이어를 선택해주세요." });

  useEffect(() => {
    if (!userId) {
      setState({ status: "loading", data: null, message: "플레이어를 선택해주세요." });
      return;
    }

    let isActive = true;
    setState({ status: "loading", data: null, message: "상세 정보를 불러오는 중..." });
    void loadAdminPlayerDetail(userId).then((result) => {
      if (!isActive) return;
      if (!result.ok) {
        setState({ status: "error", data: null, message: result.message });
        return;
      }
      setState({ status: "ready", data: result.data, message: "" });
    });

    return () => { isActive = false; };
  }, [userId, refreshKey]);

  return state;
}

function useLoader<TData>(loader: () => Promise<{ ok: true; data: TData; message: "" } | { ok: false; data: null; message: string }>, loadingMessage: string): LoadState<TData> {
  const [state, setState] = useState<LoadState<TData>>({ status: "loading", data: null, message: loadingMessage });

  useEffect(() => {
    let isActive = true;
    void loader().then((result) => {
      if (!isActive) return;
      if (!result.ok) {
        setState({ status: "error", data: null, message: result.message });
        return;
      }
      setState({ status: "ready", data: result.data, message: "" });
    });
    return () => { isActive = false; };
  }, [loader, loadingMessage]);

  return state;
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function toPositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
