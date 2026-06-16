export function validateEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function validatePassword(value: string) {
  return value.length >= 8;
}

export function validateNickname(value: string) {
  return getNicknameValidationMessage(value) === "";
}

export function getNicknameValidationMessage(value: string) {
  const nickname = value.trim();

  if (nickname.length < 2 || nickname.length > 16) {
    return "닉네임은 2~16자로 입력해주세요.";
  }

  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$/.test(nickname)) {
    return "닉네임은 한글, 영문, 숫자, _만 사용할 수 있습니다.";
  }

  return "";
}
