
// SECURITY NOTE: This is a client-side application. 
// Do NOT include your CLIENT_SECRET here. 

export const CLIENT_ID = "393782410685-miusru6sb1sv4bhmmlhs14dbpbcamcge.apps.googleusercontent.com";
export const BLOG_ID = "1587234114407540772";

// Combining all necessary scopes
export const SCOPES = [
  "https://www.googleapis.com/auth/blogger",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid"
].join(" ");

export const APP_CONFIG = {
  clientId: CLIENT_ID,
  blogId: BLOG_ID,
  scopes: SCOPES,
};
