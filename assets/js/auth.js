// 로그인 공통 기능
window.PGS_AUTH = {
  async user(){
    if (!window.sb) return null;
    const { data } = await sb.auth.getUser();
    return data ? data.user : null;
  },
  async signIn(email, password){
    return sb.auth.signInWithPassword({ email, password });
  },
  async signUp(email, password, nickname){
    return sb.auth.signUp({ email, password, options: { data: { nickname } } });
  },
  async signOut(){
    await sb.auth.signOut();
    location.reload();
  }
};
