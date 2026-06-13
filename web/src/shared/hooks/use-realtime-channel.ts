"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { env } from "@/shared/config/env";

export function useRealtimeChannel<TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
) {
  useEffect(() => {
    const socket = io(env.realtimeUrl, {
      path: env.realtimePath,
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on(eventName, handler);

    return () => {
      socket.off(eventName, handler);
      socket.close();
    };
  }, [eventName, handler]);
}
