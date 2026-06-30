import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
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
            <ul className="admin-row-list" aria-label="플레이어 검색 결과">
              {rows.data.length === 0 ? <li><strong>결과 없음</strong><span>-</span></li> : rows.data.map((row) => (
                <li key={row.user_id}>
                  <button className={row.user_id === selectedUserId ? "is-active" : ""} type="button" onClick={() => setSelectedUserId(row.user_id)}>
                    <strong>{row.character_name ?? row.nickname ?? row.email ?? row.user_id}</strong>
                    <span>{row.level ? `LV.${row.level}` : "캐릭터 없음"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <PlayerDetailPanel detail={detail} />
      </div>
    </section>
  );
}

export function AdminSupportScreen() {
  useDocumentTitle("TOWER://ADMIN_SUPPORT");

  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<AdminPlayerSearchRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const detail = useAdminPlayerDetail(selectedUserId);
  const selectedCharacterId = detail.status === "ready" ? detail.data.character?.id ?? null : null;

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
          <ul className="admin-row-list" aria-label="지원 대상">
            {players.map((player) => (
              <li key={player.user_id}>
                <button className={player.user_id === selectedUserId ? "is-active" : ""} type="button" onClick={() => setSelectedUserId(player.user_id)}>
                  <strong>{player.character_name ?? player.nickname ?? player.email ?? player.user_id}</strong>
                  <span>{player.level ? `LV.${player.level}` : "캐릭터 없음"}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-head">
            <span>ACTION</span>
            <h2>사냥 상태 초기화</h2>
          </div>
          <textarea className="admin-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="처리 사유" rows={4} />
          <button className="btn danger" type="button" disabled={!selectedCharacterId || isSubmitting} onClick={handleResetHunt}>
            {isSubmitting ? "처리 중..." : "상태 초기화"}
          </button>
          {message && <p className={`panel-message ${message.includes("했습니다") ? "" : "is-error"}`}>{message}</p>}
        </article>
      </div>

      <PlayerDetailPanel detail={detail} />
    </section>
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

function useAdminPlayerDetail(userId: string | null): LoadState<AdminPlayerDetail> {
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
  }, [userId]);

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
