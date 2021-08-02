import { ReactNode } from "react";
import {
  SwitchVerticalIcon,
  SearchIcon,
  DatabaseIcon,
  CashIcon,
  UserIcon,
} from "@heroicons/react/outline";
import { PublicKey } from '@solana/web3.js';

type Route = {
  path: string;
  Icon: ReactNode | null;
  isDrawerNav: boolean;
};

export interface IRoutes {
  create: Route;
  customize: Route;
  trade: Route;
  myCoins: Route;
  wallet: Route;
  search: Route;
  profile: Route;
  editProfile: Route;
  viewProfile: Route;
}

export function viewProfilePath(tokenBondingKey: PublicKey): string {
  return routes.viewProfile.path.replace(":tokenBondingKey", tokenBondingKey.toBase58());
}

export function tradePath(tokenBondingKey: PublicKey): string {
  return routes.trade.path.replace(":tokenBondingKey", tokenBondingKey.toBase58())
}

export const routes: IRoutes = {
  create: { path: "/create", Icon: null, isDrawerNav: false },
  customize: { path: "/customize", Icon: null, isDrawerNav: false },
  trade: {
    path: "/trade/:tokenBondingKey",
    Icon: SwitchVerticalIcon,
    isDrawerNav: true,
  },
  myCoins: { path: "/mycoins", Icon: DatabaseIcon, isDrawerNav: true },
  wallet: { path: "/wallet", Icon: CashIcon, isDrawerNav: true },
  search: { path: "/search", Icon: SearchIcon, isDrawerNav: true },
  profile: { path: "/profile", Icon: UserIcon, isDrawerNav: true },
  editProfile: { path: "/profile/edit", Icon: UserIcon, isDrawerNav: false },
  viewProfile: { path: "/profile/view/:tokenBondingKey", Icon: UserIcon, isDrawerNav: false },
};

export const paths: string[] = Object.keys(routes).map(
  (route) => routes[route as keyof IRoutes].path
);
