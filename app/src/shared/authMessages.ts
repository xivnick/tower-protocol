const AUTH_ERROR_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "이메일 또는 비밀번호를 확인해주세요."],
  [/email rate limit exceeded/i, "이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요."],
  [/user already registered/i, "이미 가입된 이메일입니다."],
  [/already registered/i, "이미 가입된 이메일입니다."],
  [/signup is disabled/i, "현재 회원가입이 비활성화되어 있습니다."],
  [/password should be at least/i, "비밀번호 조건을 확인해주세요."],
  [/weak password/i, "비밀번호가 너무 약합니다."],
  [/invalid email/i, "이메일 형식을 확인해주세요."],
  [/email address .* is invalid/i, "사용할 수 없는 이메일 주소입니다."],
  [/email not confirmed/i, "이메일 확인을 완료한 뒤 다시 접속해주세요."],
  [/network/i, "네트워크 연결을 확인해주세요."],
  [/failed to fetch/i, "네트워크 연결을 확인해주세요."],
  [/row-level security/i, "프로필 권한 설정을 확인해주세요."],
  [/profiles_nickname_format_check/i, "닉네임은 한글, 영문, 숫자, _만 사용할 수 있습니다."],
  [/profiles_nickname_unique_idx/i, "이미 사용 중인 닉네임입니다."],
  [/characters_name_unique_idx/i, "이미 사용 중인 캐릭터 이름입니다."],
  [/characters_level_check/i, "캐릭터 레벨 값을 확인해주세요."],
  [/characters_experience_check/i, "캐릭터 경험치 값을 확인해주세요."],
  [/characters_progression_check/i, "캐릭터 성장 값을 확인해주세요."],
  [/characters_stats_min_check/i, "스탯 값을 확인해주세요."],
  [/characters_stats_total_check/i, "스탯 포인트 값을 확인해주세요."],
  [/character_not_found/i, "캐릭터를 찾을 수 없습니다."],
  [/invalid_stat_delta/i, "스탯 배분 값을 확인해주세요."],
  [/empty_stat_delta/i, "배분할 스탯을 선택해주세요."],
  [/insufficient_stat_points/i, "스탯 포인트가 부족합니다."],
  [/hunt_on_cooldown/i, "전투 재정비 중입니다."],
  [/hunt_defeat_recovery/i, "패배 후 회복 중입니다."],
  [/training_charges_empty/i, "훈련 보관이 비어 있습니다."],
  [/training_dummy_not_defeated/i, "허수아비 전투를 완료하지 못했습니다."],
  [/shared_name_conflict/i, "이미 사용 중인 이름입니다."],
  [/duplicate key value/i, "이미 사용 중인 값입니다."],
];

export function toKoreanAuthMessage(message?: string, fallback = "요청을 처리하지 못했습니다.") {
  if (!message) return fallback;

  const matched = AUTH_ERROR_MESSAGES.find(([pattern]) => pattern.test(message));
  return matched ? matched[1] : fallback;
}
