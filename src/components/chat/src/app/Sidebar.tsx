import React, { useState } from "react";
import { User } from "lucide-react";
import Image from "next/image";

const agents = [
  { name: "Synesia", icon: <Image src="/robot.svg" width={46} height={46} alt="Robot" className="min-w-[46px]" /> },
  { name: "Marketing", icon: <User className="w-[46px] h-[46px]" /> },
  { name: "Support", icon: <User className="w-[46px] h-[46px]" /> },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-full
        flex flex-col items-center py-4
        bg-white/10 border-r border-white/20
        backdrop-blur-xl shadow-xl
        transition-all duration-300 ease-in-out
        ${expanded ? "w-[280px]" : "w-[80px]"}
      `}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <nav className="flex flex-col gap-3 w-full mt-3">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={`
              flex items-center gap-4 cursor-pointer
              rounded-lg px-4 py-3 mx-2
              transition-colors duration-200
              hover:bg-white/15
              ${expanded ? "justify-start" : "justify-center"}
            `}
            title={agent.name}
          >
            {agent.icon}
            <span
              className={`
                text-white text-lg font-medium
                transition-all duration-200
                ${expanded ? "opacity-100 ml-2" : "opacity-0 ml-0 w-0 overflow-hidden"}
              `}
            >
              {agent.name}
            </span>
          </div>
        ))}
      </nav>
    </aside>
  );
} 