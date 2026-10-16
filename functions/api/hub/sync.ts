// Central Hub Data edge endpoint for Cloudflare Pages (/api/hub/sync)
import { onRequestGet as dataGet, onRequestPost as dataPost } from './data';

export const onRequestGet = dataGet;
export const onRequestPost = dataPost;
