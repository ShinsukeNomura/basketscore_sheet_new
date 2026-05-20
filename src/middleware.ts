import { NextResponse } from 'next/server';

// 認証チェックはクライアント側で行う
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
