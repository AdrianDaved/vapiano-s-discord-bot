import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/Button";

const BOT_AVATAR = "https://cdn.discordapp.com/avatars/1482419113094811658/a_72072c38b6feed34273f2259ae177d01.gif";

export default function Login() {
  const { login } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darker">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Bot avatar */}
        <div className="mx-auto w-28 h-28 rounded-full overflow-hidden mb-6 ring-4 ring-discord-blurple/50 shadow-lg shadow-discord-blurple/20">
          {!imgFailed ? (
            <img
              src={BOT_AVATAR}
              alt="Vapiano Bot"
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-discord-blurple flex items-center justify-center text-white text-3xl font-bold">
              V
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-discord-white mb-2">Vapiano Bot</h1>
        <p className="text-discord-muted mb-8">
          Inicia sesion con tu cuenta de Discord para administrar tus servidores
        </p>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 shadow-lg"
          style={{ backgroundColor: "#5865F2" }}
        >
          {/* Discord logo SVG - clean version */}
          <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
          </svg>
          Iniciar sesion con Discord
        </button>

        <p className="text-xs text-discord-muted mt-6">
          Solo pedimos acceso a tu perfil basico y lista de servidores.
        </p>
      </div>
    </div>
  );
}
