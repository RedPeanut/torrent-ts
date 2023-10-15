export const flag_queried = 0;
export const flag_initial = 1;
export const flag_no_id = 2;
export const flag_short_timeout = 3;
export const flag_failed = 4;
export const flag_ipv6_address = 5;
export const flag_alive = 6;
export const flag_done = 7;

export interface Contact {
  id;
  host;
  port;
  distance;
  token;
  flags;
}

export interface Node {
  host: string;
  port: number;
}

// module.exports = Contact;