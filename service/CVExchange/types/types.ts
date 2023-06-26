/**
 * This file is auto-generated and should not be edited.
 * It will be overwritten the next time types are generated.
 */
import {Request} from 'express'

export type Comments = {
  id: number;
  text: string | null;
  post_id: number | null;
  creator_id: number | null;
  creator_name: string | null;
  rating: number;
  datetime: Date | null;
  parent_id: number | null;
};
export type Posts = {
  id: number;
  title: string | null;
  text: string | null;
  sub_id: number | null;
  sub_name: string | null;
  creator_id: number | null;
  creator_name: string | null;
  rating: number;
  datetime: Date | null;
};
export type Ratings = {
  id: number;
  user_id: number | null;
  comment_id: number | null;
  post_id: number | null;
  rating: number | null;
  datetime: Date | null;
};
export type Subs = {
  id: number;
  name: string | null;
  description: string | null;
  sidebar: string | null;
  creator_id: number | null;
  creator_name: string | null;
  members: number | null;
  datetime: Date | null;
};
export type Users = {
  id: number;
  name: string | null;
  email: string | null;
  password: string | null;
  profile_picture: string | null;
  saved: string | null;
  note: string | null;
  my_file: string | null;
  subscribed: string | null;
};


export interface RequestV2 extends Request {
  database: any,
  userId: number,
  username: string,
  ratings: Ratings,
  postkarma: number,
  commentkarma: number,
  subscribed: Array<number>,
  subs: Subs,
  topsubs: Subs 
}