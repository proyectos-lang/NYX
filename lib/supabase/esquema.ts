/**
 * Esquema de Postgres donde vive todo lo de NYX.
 *
 * En minuscula a proposito: Postgres pliega a minusculas los identificadores
 * sin comillas, asi que un esquema llamado "NYX" obligaria a entrecomillarlo
 * en cada consulta SQL, cada politica y cada funcion.
 *
 * Cambiarlo aqui no basta: hay que cambiarlo tambien en las migraciones, en
 * supabase/config.toml y en Settings -> API -> Exposed schemas de Supabase.
 */
export const ESQUEMA = 'nyx'
