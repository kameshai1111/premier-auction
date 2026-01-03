import { uploadImage } from "./services/uploadImage";
import { createPlayer } from "./services/createPlayer";
import { getPlayers } from "./services/getPlayers";
import { updateTeamAfterSale } from "./services/updateTeamAfterSale";
import { markPlayerSold } from "./services/markPlayerSold";
import { getTeams } from "./services/getTeams";
import { createTeam } from "./services/createTeam";
import { uploadTeamLogo } from "./services/uploadTeamLogo";
import { releasePlayerFromTeam } from "./services/releasePlayer";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { deletePlayer } from "./services/deletePlayer";
import { deleteTeam } from "./services/deleteTeam";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Player, Team, AuctionState, PlayerType } from "./types";
import { INITIAL_TEAMS, INITIAL_PLAYERS, INITIAL_BUDGET } from "./constants";
import { getScoutReport } from "./services/gemini";
import {
  UserIcon,
  WalletIcon,
  GavelIcon,
  BrainIcon,
  BatIcon,
  BallIcon,
  AllRounderIcon,
  DownloadIcon,
  TableIcon,
  LayoutGridIcon,
} from "./components/Icons";

const DEFAULT_PRESETS = [
  "#dc2626", // Red
  "#7e22ce", // Purple
  "#facc15", // Yellow
  "#f97316", // Orange
  "#1d4ed8", // Blue
  "#38bdf8", // Sky
  "#16a34a", // Green
  "#ec4899", // Pink
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const [view, setView] = useState<"setup" | "auction" | "details">("setup");
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [players, setPlayers] = useState<Player[]>([]);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const ADMIN_EMAIL = "kameshai1111@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [formError, setFormError] = useState<string | null>(null);

  // App.tsx

  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);

  const [playerImageFile, setPlayerImageFile] = useState<File | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [rosterViewMode, setRosterViewMode] = useState<"cards" | "table">(
    "cards"
  );
  const [auctionSearchId, setAuctionSearchId] = useState("");
  const setupFileInputRef = useRef<HTMLInputElement>(null);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);

  const [customPresets, setCustomPresets] = useState<string[]>(DEFAULT_PRESETS);
  const [activePresetIdx, setActivePresetIdx] = useState<number>(0);

  const [newPlayer, setNewPlayer] = useState<{
    id: string;
    name: string;
    club: string;
    type: PlayerType;
    basePrice: number;
    rating: number;
    image: string;
  }>({
    id: "",
    name: "",
    club: "",
    type: "Batsman",
    basePrice: 50,
    rating: 80,
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&h=200&fit=crop",
  });

  const [auction, setAuction] = useState<AuctionState>({
    currentPlayer: null,
    currentBid: 0,
    highestBidderId: null,
    status: "IDLE",
    scoutReport: "",
  });

  const [newTeam, setNewTeam] = useState<{
    name: string;
    budget: number;
    logo: string;
  }>({
    name: "",
    budget: INITIAL_BUDGET,
    logo: "https://img.freepik.com/free-vector/sport-logo-design_23-2148472448.jpg?w=200",
  });
  const currentActiveColor = customPresets[activePresetIdx];

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);

        const [firestorePlayers, firestoreTeams] = await Promise.all([
          getPlayers(),
          getTeams(),
        ]);

        // 🔥 REBUILD TEAMS FROM PLAYERS
        const rebuiltTeams = firestoreTeams.map((team) => {
          const ownedPlayers = firestorePlayers.filter(
            (p) => p.isSold && p.soldToId === team.id
          );

          const spent = ownedPlayers.reduce(
            (sum, p) => sum + (p.soldPrice || 0),
            0
          );

          return {
            ...team,
            players: ownedPlayers,
            budget: team.initialBudget - spent,
          };
        });

        setPlayers(firestorePlayers);
        setTeams(rebuiltTeams);
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    console.log("AUTH USER:", user?.email);
    console.log("IS ADMIN:", isAdmin);
  }, [user, isAdmin]);

  const activeTeamDetails = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlayerImageFile(file);

    // 🔥 CLEAR ERROR IMMEDIATELY
    setFormError(null);

    // preview only
    setNewPlayer((prev) => ({
      ...prev,
      image: URL.createObjectURL(file),
    }));
  };

  // App.tsx

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // preview only (UI)
    setNewTeam((prev) => ({
      ...prev,
      logo: URL.createObjectURL(file),
    }));

    // real file for upload
    setTeamLogoFile(file);
  };

  const addTeam = async () => {
    if (!newTeam.name) {
      alert("Team name required");
      return;
    }

    if (!teamLogoFile) {
      alert("Upload team logo");
      return;
    }

    try {
      setLoading(true);

      const teamId = `t${Date.now()}`;

      // 1️⃣ upload logo
      const logoUrl = await uploadTeamLogo(teamLogoFile, teamId);

      // 2️⃣ build team object
      const team: Team = {
        id: teamId,
        name: newTeam.name,
        logo: logoUrl,
        color: currentActiveColor,
        budget: newTeam.budget,
        initialBudget: newTeam.budget,
        players: [],
      };

      // 3️⃣ save to Firestore
      await createTeam(team);

      // 4️⃣ update UI
      setTeams((prev) => [...prev, team]);

      // 5️⃣ reset form
      setNewTeam({
        name: "",
        budget: INITIAL_BUDGET,
        logo: "https://img.freepik.com/free-vector/sport-logo-design_23-2148472448.jpg?w=200",
      });

      setTeamLogoFile(null);
    } catch (e) {
      console.error("Team creation failed", e);
      alert("Team creation failed");
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async () => {
    if (
      !newPlayer.id ||
      !newPlayer.name ||
      !newPlayer.club ||
      !newPlayer.type
    ) {
      alert("Fill all fields");
      return;
    }

    if (!playerImageFile) {
      setFormError("Please upload a player image");
      return;
    }

    try {
      setSavingPlayer(true); // 👈 START loading

      const imageUrl = await uploadImage(playerImageFile);

      const player: Player = {
        id: newPlayer.id,
        name: newPlayer.name,
        club: newPlayer.club,
        type: newPlayer.type,
        basePrice: newPlayer.basePrice || 50,
        rating: 80,
        image: imageUrl,
        isSold: false,
      };

      await createPlayer(player);

      setPlayers((prev) => [...prev, player]);

      setFormError(null); // 👈 ADD THIS

      setNewPlayer({
        id: "",
        name: "",
        club: "",
        type: "Batsman",
        basePrice: 50,
        rating: 80,
        image:
          "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&h=200&fit=crop",
      });

      setPlayerImageFile(null);
    } catch (e) {
      console.error("Player create failed", e);
      alert("Something went wrong");
    } finally {
      setSavingPlayer(false); // 👈 STOP loading
    }
  };

  const releasePlayer = async (teamId: string, playerId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const player = team.players.find((p) => p.id === playerId);
    if (!player) return;

    // 🔥 Firestore (single source of truth)
    await releasePlayerFromTeam(teamId, player.id);

    // 🧠 UI state update
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              budget: t.budget + (player.soldPrice || 0),
              players: t.players.filter((p) => p.id !== playerId),
            }
          : t
      )
    );

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              isSold: false,
              soldPrice: undefined,
              soldToId: undefined,
              soldToName: undefined,
            }
          : p
      )
    );
  };

  const startAuction = useCallback(async (player: Player) => {
    if (player.isSold) return;
    setAuction({
      currentPlayer: player,
      currentBid: player.basePrice,
      highestBidderId: null,
      status: "BIDDING",
      scoutReport: "Accessing Terminal...",
    });
    const report = await getScoutReport(player);
    setAuction((prev) => ({ ...prev, scoutReport: report }));
  }, []);

  const handleIdSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = players.find(
      (p) =>
        p.id.toLowerCase() === auctionSearchId.trim().toLowerCase() && !p.isSold
    );
    if (found) {
      startAuction(found);
      setAuctionSearchId("");
    } else {
      alert("ID not recognized or player already sold.");
    }
  };

  const incrementBid = () => {
    if (!isAdmin) return;

    setAuction((prev) => ({
      ...prev,
      currentBid: prev.currentBid + 50,
    }));
  };

  const decrementBid = () => {
    if (!isAdmin) return;

    setAuction((prev) => {
      if (!prev.currentPlayer) return prev;
      if (prev.currentBid <= prev.currentPlayer.basePrice) return prev;

      return {
        ...prev,
        currentBid: prev.currentBid - 50,
      };
    });
  };

  const selectBidder = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    if (team.players.length >= 12) return;
    if (team.budget < auction.currentBid) return;
    setAuction((prev) => ({ ...prev, highestBidderId: teamId }));
  };

  const confirmSale = useCallback(async () => {
    if (!auction.currentPlayer || !auction.highestBidderId) {
      alert("Please select a team before confirming the sale.");
      return;
    }
    const winnerId = auction.highestBidderId;
    const winner = teams.find((t) => t.id === winnerId);
    if (!winner) return;

    const soldData = {
      ...auction.currentPlayer,
      isSold: true,
      soldToId: winner.id,
      soldToName: winner.name,
      soldPrice: auction.currentBid,
    };

    // 🔒 FIRESTORE PERSIST
    await markPlayerSold(
      soldData.id,
      winner.id,
      winner.name,
      auction.currentBid
    );

    await updateTeamAfterSale(winner.id, soldData.id, auction.currentBid);

    setTeams((prev) =>
      prev.map((t) =>
        t.id === winnerId
          ? {
              ...t,
              budget: t.budget - auction.currentBid,
              players: [...t.players, soldData],
            }
          : t
      )
    );

    setPlayers((prev) =>
      prev.map((p) => (p.id === auction.currentPlayer!.id ? soldData : p))
    );
    setAuction((prev) => ({ ...prev, status: "SOLD" }));

    setTimeout(() => {
      setAuction({
        currentPlayer: null,
        currentBid: 0,
        highestBidderId: null,
        status: "IDLE",
        scoutReport: "",
      });
    }, 1500);
  }, [auction, teams]);

  const renderTypeIcon = (type: PlayerType, className?: string) => {
    switch (type) {
      case "Batsman":
        return <BatIcon className={className || "w-4 h-4"} />;
      case "Bowler":
        return <BallIcon className={className || "w-4 h-4"} />;
      case "All-rounder":
        return <AllRounderIcon className={className || "w-4 h-4"} />;
      default:
        return <UserIcon className={className || "w-4 h-4"} />;
    }
  };

  const getStyleColor = (color: string) => {
    if (color.startsWith("#")) return color;
    const tailwind: any = {
      "bg-red-600": "#dc2626",
      "bg-purple-700": "#7e22ce",
      "bg-yellow-400": "#facc15",
      "bg-orange-500": "#f97316",
      "bg-blue-600": "#2563eb",
      "bg-sky-500": "#0ea5e9",
    };
    return tailwind[color] || "#0f172a";
  };

  const updatePresetColor = (newColor: string) => {
    const newPresets = [...customPresets];
    newPresets[activePresetIdx] = newColor;
    setCustomPresets(newPresets);
  };

  const downloadTeamData = (team: Team) => {
    const headers = ["Name", "ID", "Type", "Price"];
    const rows = team.players.map((p) => [
      p.name,
      p.id,
      p.type,
      `₹${p.soldPrice}`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${team.name}_Assets.csv`);
    link.click();
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#F9FAFB] overflow-hidden text-slate-900">
      {/* COMPACT NAV BAR */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-slate-900 p-1.5 sm:p-2 rounded-xl">
            <GavelIcon className="text-white w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-sm sm:text-lg font-black tracking-tighter uppercase italic leading-none">
              PREMIER AUCTION
            </h1>
            <span className="text-[7px] sm:text-[8px] font-black text-slate-400 tracking-[0.2em] uppercase">
              V5.1 COMPACT
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: "setup", label: "SETUP" },
            { id: "auction", label: "LIVE" },
            { id: "details", label: "ROSTERS" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] font-black tracking-widest transition-all ${
                view === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="text-right flex flex-col items-end gap-1">
          <div className="text-[7px] sm:text-[9px] font-black text-slate-400 tracking-widest uppercase">
            MARKET
          </div>

          <div className="text-xs sm:text-lg font-black text-slate-900 italic leading-none">
            ₹{players.reduce((sum, p) => sum + (p.soldPrice || 0), 0)}
          </div>

          {/* 🔐 ADMIN AUTH BUTTON */}
          {!user && (
            <button
              onClick={async () => {
                const email = prompt("Admin email");
                const password = prompt("Password");
                if (!email || !password) return;

                const auth = getAuth();
                const { signInWithEmailAndPassword } = await import(
                  "firebase/auth"
                );

                try {
                  await signInWithEmailAndPassword(auth, email, password);
                  alert("Logged in");
                } catch {
                  alert("Login failed");
                }
              }}
              className="text-[9px] bg-black text-white px-2 py-1 rounded mt-1"
            >
              ADMIN LOGIN
            </button>
          )}

          {user && (
            <button
              onClick={async () => {
                const auth = getAuth();
                await auth.signOut();
              }}
              className="text-[9px] bg-red-600 text-white px-2 py-1 rounded mt-1"
            >
              LOGOUT
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {view === "setup" && (
          <main className="h-full overflow-y-auto p-4 sm:p-8 miro-grid">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {/* COMPACT FRANCHISE REGISTRY */}
              <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-xl border border-slate-100 h-fit">
                <h2 className="text-base sm:text-lg font-black mb-4 flex items-center gap-3">
                  <WalletIcon className="w-5 h-5 text-slate-300" /> Franchise
                  Registry
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex items-center gap-4 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                      <img
                        src={newTeam.logo}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm border-2 border-white cursor-pointer hover:opacity-80"
                        onClick={() => teamLogoInputRef.current?.click()}
                        alt="Logo"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => teamLogoInputRef.current?.click()}
                          className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 text-left"
                        >
                          Upload Icon
                        </button>
                        <input
                          type="file"
                          className="hidden"
                          ref={teamLogoInputRef}
                          onChange={handleTeamLogoUpload}
                          accept="image/*"
                        />
                      </div>
                    </div>
                    <input
                      placeholder="Name"
                      className="col-span-2 p-3 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-200 text-xs sm:text-sm"
                      value={newTeam.name}
                      onChange={(e) =>
                        setNewTeam({ ...newTeam, name: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Budget"
                      className="p-3 bg-slate-50 border-none rounded-xl font-bold outline-none text-xs sm:text-sm"
                      value={newTeam.budget}
                      onChange={(e) =>
                        setNewTeam({
                          ...newTeam,
                          budget: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <button
                      onClick={addTeam}
                      className="bg-slate-900 text-white font-black rounded-xl uppercase text-[8px] sm:text-[9px] tracking-widest"
                    >
                      Register
                    </button>
                  </div>
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        type="color"
                        className="w-8 h-8 rounded-lg cursor-pointer shrink-0"
                        value={customPresets[activePresetIdx]}
                        onChange={(e) => updatePresetColor(e.target.value)}
                      />
                      <div className="grid grid-cols-8 gap-1 flex-1">
                        {customPresets.map((hex, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePresetIdx(idx)}
                            className={`w-full aspect-square rounded-md border-2 ${
                              activePresetIdx === idx
                                ? "border-slate-900 ring-2 ring-slate-100"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {teams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img
                            src={t.logo}
                            className="w-6 h-6 rounded-md object-cover"
                            alt="logo"
                          />
                          <span className="font-bold text-[10px] sm:text-[11px] uppercase truncate max-w-[100px] sm:max-w-none">
                            {t.name}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (!isAdmin) return;

                              if (!window.confirm("Delete team permanently?"))
                                return;

                              await deleteTeam(t.id);

                              setTeams((prev) =>
                                prev.filter((tm) => tm.id !== t.id)
                              );
                            }}
                            className="text-red-400 text-[8px] font-black uppercase"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COMPACT PLAYER POOL */}
              <div className="bg-white rounded-[24px] p-4 sm:p-6 shadow-xl border border-slate-100 h-fit">
                <h2 className="text-base sm:text-lg font-black mb-4 flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-slate-300" /> Player Pool
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="col-span-2 flex flex-col items-center gap-2 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                    <img
                      src={newPlayer.image}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-md border-4 border-white cursor-pointer hover:opacity-80 transition-opacity"
                      alt="Upload Preview"
                      onClick={() => setupFileInputRef.current?.click()}
                    />
                    <button
                      onClick={() => setupFileInputRef.current?.click()}
                      className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Upload Image
                    </button>
                    <input
                      type="file"
                      className="hidden"
                      ref={setupFileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                    />
                  </div>

                  <input
                    placeholder="ID (e.g. p101)"
                    className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs sm:text-sm"
                    value={newPlayer.id}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, id: e.target.value })
                    }
                  />
                  <input
                    placeholder="Name"
                    className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs sm:text-sm"
                    value={newPlayer.name}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, name: e.target.value })
                    }
                  />
                  <input
                    placeholder="Club"
                    className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs sm:text-sm"
                    value={newPlayer.club}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, club: e.target.value })
                    }
                  />
                  <select
                    className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs sm:text-sm"
                    value={newPlayer.type}
                    onChange={(e) =>
                      setNewPlayer({
                        ...newPlayer,
                        type: e.target.value as PlayerType,
                      })
                    }
                  >
                    <option value="Left-Batsman">Batsman</option>
                    <option value="Right-Batsman">Bowler</option>
                    <option value="Left-Bowler">Bowler</option>
                    <option value="Right-Bowler">Bowler</option>
                    <option value="All-rounder">All-rounder</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Base Price"
                    className="p-3 bg-slate-50 border-none rounded-xl font-bold text-xs sm:text-sm"
                    value={newPlayer.basePrice}
                    onChange={(e) =>
                      setNewPlayer({
                        ...newPlayer,
                        basePrice: parseInt(e.target.value) || 0,
                      })
                    }
                  />

                  {formError && (
                    <div className="col-span-2 mt-1 text-red-500 text-[10px] font-bold text-center">
                      {formError}
                    </div>
                  )}

                  <button
                    onClick={addPlayer}
                    disabled={savingPlayer}
                    className={`
    mt-1 col-span-2 w-full
    rounded-2xl
    py-3
    text-[10px] sm:text-[11px]
    font-black uppercase tracking-widest
    transition-all duration-200
    ${
      savingPlayer
        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
        : "bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 active:scale-[0.98]"
    }
  `}
                  >
                    {savingPlayer ? "ADDING..." : "ADD PLAYER"}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          className="w-8 h-8 rounded-md object-cover bg-white"
                          alt="player"
                        />
                        <div>
                          <div className="font-bold text-[9px] sm:text-[10px] uppercase">
                            {p.name}
                          </div>
                          <div className="text-[7px] sm:text-[8px] text-slate-400">
                            {p.id} • {p.type}
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            if (!isAdmin) return;

                            if (!window.confirm("Delete player permanently?"))
                              return;

                            await deletePlayer(p.id);

                            setPlayers((prev) =>
                              prev.filter((pl) => pl.id !== p.id)
                            );
                          }}
                          className="text-red-400 text-[8px] font-black"
                        >
                          DEL
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )}

        {view === "auction" && (
          <main className="h-full flex overflow-hidden flex-col md:flex-row">
            {/* SIDEBAR - COLLAPSIBLE ON MOBILE? (Currently just vertical) */}
            <aside className="w-full md:w-[260px] lg:w-[320px] bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-4 sm:p-8 shrink-0 shadow-lg z-20 max-h-[30vh] md:max-h-full">
              <form onSubmit={handleIdSearch} className="mb-4 sm:mb-8">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-50 rounded-xl px-4 py-2 sm:py-3 font-bold text-[10px] sm:text-xs outline-none focus:ring-2 focus:ring-slate-100"
                    placeholder="Search ID..."
                    value={auctionSearchId}
                    onChange={(e) => setAuctionSearchId(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 text-white px-3 sm:px-4 rounded-xl font-black text-[8px] sm:text-[9px]"
                  >
                    LOAD
                  </button>
                </div>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 custom-scrollbar">
                <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 tracking-widest mb-2 sm:mb-4 uppercase">
                  INVENTORY
                </h3>
                {players
                  .filter((p) => !p.isSold)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => startAuction(p)}
                      className={`flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                        auction.currentPlayer?.id === p.id
                          ? "bg-white border-slate-900 shadow-lg"
                          : "bg-slate-50 border-transparent hover:border-slate-100"
                      }`}
                    >
                      <img
                        src={p.image}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm"
                        alt="player"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {renderTypeIcon(
                            p.type,
                            "w-2.5 h-2.5 sm:w-3 h-3 text-slate-400"
                          )}
                          <div className="text-[9px] sm:text-[11px] font-black uppercase truncate">
                            {p.name}
                          </div>
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate-400">
                          {p.id} • {p.type}
                        </span>
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-black italic shrink-0">
                        ₹{p.basePrice}
                      </div>
                    </div>
                  ))}
              </div>
            </aside>

            {/* AUCTION DASHBOARD */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {auction.currentPlayer ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 flex overflow-hidden flex-col xl:flex-row">
                    {/* CENTER STAGE */}
                    <div className="flex-1 p-4 sm:p-8 flex flex-col items-center bg-slate-50 relative overflow-y-auto custom-scrollbar">
                      <div className="w-full max-w-[320px] sm:max-w-[480px] aspect-[4/3] rounded-[24px] sm:rounded-[48px] overflow-hidden shadow-2xl border-[6px] sm:border-[10px] border-white transform hover:scale-[1.01] transition-transform duration-500 bg-white shrink-0">
                        <img
                          src={auction.currentPlayer.image}
                          className="w-full h-full object-contain bg-white"
                          alt="current-player"
                        />
                      </div>

                      <div className="mt-4 sm:mt-8 text-center max-w-2xl w-full">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                          <span className="bg-slate-900 text-white px-3 sm:px-5 py-1 sm:py-1.5 rounded-full text-[7px] sm:text-[9px] font-black tracking-widest uppercase">
                            ID: {auction.currentPlayer.id}
                          </span>
                          <div className="bg-white border border-slate-200 px-3 py-1 sm:py-1.5 rounded-full shadow-sm flex items-center gap-1 sm:gap-2">
                            {renderTypeIcon(
                              auction.currentPlayer.type,
                              "w-2.5 h-2.5 sm:w-3 h-3 text-slate-400"
                            )}
                            <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase">
                              {auction.currentPlayer.type}
                            </span>
                          </div>
                        </div>
                        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none mb-1 sm:mb-2">
                          {auction.currentPlayer.name}
                        </h2>
                        <div className="text-[10px] sm:text-sm font-bold text-slate-400 tracking-widest uppercase italic mb-4 sm:mb-6">
                          {auction.currentPlayer.club} DIVISION DATA
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-white rounded-[20px] sm:rounded-[32px] border border-slate-100 shadow-sm text-left mb-6 sm:mb-8">
                          <BrainIcon className="text-slate-900 w-5 h-5 sm:w-6 h-6 flex-shrink-0" />
                          <p className="text-[10px] sm:text-[12px] font-bold text-slate-700 italic leading-snug">
                            "{auction.scoutReport}"
                          </p>
                        </div>
                      </div>

                      <div className="w-full mt-auto pt-4 sm:pt-6 border-t border-slate-200">
                        <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 uppercase text-center">
                          SELECT BIDDING FRANCHISE
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 pb-4">
                          {teams.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => selectBidder(t.id)}
                              className={`p-2 sm:p-4 rounded-[16px] sm:rounded-[24px] border-2 transition-all flex flex-col justify-between items-start h-24 sm:h-32 group ${
                                t.budget < auction.currentBid
                                  ? "opacity-20 grayscale"
                                  : "hover:border-slate-900 shadow-sm"
                              } ${
                                auction.highestBidderId === t.id
                                  ? "text-white border-transparent shadow-xl ring-4 ring-black/5"
                                  : "bg-white border-slate-50"
                              }`}
                              style={{
                                backgroundColor:
                                  auction.highestBidderId === t.id
                                    ? getStyleColor(t.color)
                                    : "white",
                              }}
                            >
                              <div className="w-full flex justify-between">
                                <div
                                  className={`w-6 h-6 sm:w-8 h-8 rounded-lg flex items-center justify-center border overflow-hidden ${
                                    auction.highestBidderId === t.id
                                      ? "bg-white border-white"
                                      : "bg-slate-50 border-slate-100"
                                  }`}
                                >
                                  {t.logo ? (
                                    <img
                                      src={t.logo}
                                      className="w-full h-full object-cover"
                                      alt="t-logo"
                                    />
                                  ) : (
                                    <div
                                      className="w-2 h-2 sm:w-2.5 h-2.5 rounded-full"
                                      style={{
                                        backgroundColor: getStyleColor(t.color),
                                      }}
                                    ></div>
                                  )}
                                </div>
                                <span
                                  className={`text-[7px] sm:text-[8px] font-black ${
                                    auction.highestBidderId === t.id
                                      ? "text-white/60"
                                      : "text-slate-300"
                                  }`}
                                >
                                  {t.players.length}/12
                                </span>
                              </div>
                              <div className="w-full">
                                <span
                                  className={`text-[8px] sm:text-[9px] font-black uppercase truncate block mb-0.5 ${
                                    auction.highestBidderId === t.id
                                      ? "text-white/80"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {t.name}
                                </span>
                                <div
                                  className={`text-sm sm:text-xl font-black italic leading-none ${
                                    auction.highestBidderId === t.id
                                      ? "text-white"
                                      : "text-slate-900"
                                  }`}
                                >
                                  ₹{t.budget}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL - LIVE VALUATION */}
                    <div className="w-full xl:w-[380px] bg-white border-t xl:border-t-0 xl:border-l border-slate-100 flex flex-col shadow-xl z-10">
                      <div className="p-4 sm:p-8 border-b border-slate-50 bg-[#F9FAFB]/80">
                        <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-2 uppercase">
                          LIVE VALUATION
                        </h3>
                        <div className="text-4xl sm:text-6xl lg:text-7xl font-black text-orange-600 tracking-tighter italic leading-none tabular-nums">
                          ₹{auction.currentBid}
                        </div>
                      </div>

                      <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-4 uppercase">
                          CURRENT BIDDER
                        </h3>
                        {auction.highestBidderId ? (
                          <div className="bg-slate-50 p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] border border-slate-100">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                              <img
                                src={
                                  teams.find(
                                    (t) => t.id === auction.highestBidderId
                                  )!.logo
                                }
                                className="w-6 h-6 sm:w-8 h-8 rounded-lg object-cover"
                                alt="bidder-logo"
                              />
                              <span className="text-base sm:text-lg font-black uppercase italic">
                                {
                                  teams.find(
                                    (t) => t.id === auction.highestBidderId
                                  )!.name
                                }
                              </span>
                            </div>
                            <div className="space-y-2 sm:space-y-4">
                              <div>
                                <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">
                                  REMAINING BUDGET
                                </div>
                                <div className="text-xl sm:text-3xl font-black italic">
                                  ₹
                                  {
                                    teams.find(
                                      (t) => t.id === auction.highestBidderId
                                    )!.budget
                                  }
                                </div>
                              </div>
                              <div>
                                <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase">
                                  SQUAD COUNT
                                </div>
                                <div className="text-xl sm:text-3xl font-black italic">
                                  {
                                    teams.find(
                                      (t) => t.id === auction.highestBidderId
                                    )!.players.length
                                  }
                                  /12
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 sm:py-12 border-2 border-dashed border-slate-100 rounded-[20px] sm:rounded-[32px]">
                            <span className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase italic">
                              NO BIDS YET
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION BAR */}
                  <div className="h-24 sm:h-32 bg-white border-t border-slate-100 p-4 sm:p-8 flex items-center gap-3 sm:gap-6 shadow-2xl z-30">
                    <div className="flex gap-3 flex-1">
                      <button
                        onClick={decrementBid}
                        disabled={!isAdmin}
                        className="px-6 py-3 bg-slate-200 rounded-[16px] font-black text-lg disabled:opacity-40"
                      >
                        −50
                      </button>

                      <button
                        onClick={incrementBid}
                        disabled={!isAdmin}
                        className="px-6 py-3 bg-slate-900 text-white rounded-[16px] font-black text-lg disabled:opacity-40"
                      >
                        +50
                      </button>
                    </div>

                    <button
                      onClick={confirmSale}
                      disabled={
                        !auction.highestBidderId || auction.status === "SOLD"
                      }
                      className={`w-[140px] sm:w-[280px] py-3 sm:py-5 rounded-[16px] sm:rounded-[24px] font-black text-lg sm:text-3xl italic tracking-widest transition-all group ${
                        auction.status === "SOLD"
                          ? "bg-green-500 text-white cursor-default"
                          : "bg-orange-600 text-white hover:bg-green-600 active:scale-95"
                      }`}
                    >
                      {auction.status === "SOLD" ? "SOLD" : "SELL"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 p-8 text-center">
                  <GavelIcon className="w-16 h-16 sm:w-32 sm:h-32 mb-4 sm:mb-8 text-slate-900" />
                  <h2 className="text-2xl sm:text-5xl font-black tracking-widest italic uppercase">
                    STANDBY
                  </h2>
                </div>
              )}
            </div>
          </main>
        )}

        {view === "details" && (
          <main className="h-full overflow-y-auto p-4 sm:p-10 pb-40 miro-grid">
            <div className="max-w-6xl mx-auto pb-24">
              <div className="mb-6 sm:mb-12 text-center">
                <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter mb-4 sm:mb-8">
                  Asset Review
                </h2>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black transition-all border-b-4 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-base ${
                        selectedTeamId === t.id
                          ? "text-white border-black/20 -translate-y-1 shadow-lg"
                          : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                      }`}
                      style={{
                        backgroundColor:
                          selectedTeamId === t.id
                            ? getStyleColor(t.color)
                            : "white",
                      }}
                    >
                      <img
                        src={t.logo}
                        className="w-4 h-4 sm:w-6 h-6 rounded-md object-cover"
                        alt="t-logo"
                      />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {activeTeamDetails ? (
                <div className="bg-white rounded-[24px] sm:rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                  <div
                    className="h-2 sm:h-4"
                    style={{
                      backgroundColor: getStyleColor(activeTeamDetails.color),
                    }}
                  ></div>
                  <div className="p-4 sm:p-12">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 sm:gap-10 mb-8 sm:mb-16">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-8">
                          <img
                            src={activeTeamDetails.logo}
                            className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm"
                            alt="t-logo"
                          />
                          <h3 className="text-3xl sm:text-7xl font-black italic uppercase leading-none tracking-tighter truncate">
                            {activeTeamDetails.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-10">
                          <div className="flex-1 max-w-xs">
                            <div className="text-[8px] sm:text-[10px] font-black text-slate-400 mb-1 sm:mb-2 uppercase tracking-widest">
                              SQUAD: {activeTeamDetails.players.length}/12
                            </div>
                            <div className="h-2 sm:h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className="h-full rounded-full transition-all duration-700 shadow-sm"
                                style={{
                                  width: `${
                                    (activeTeamDetails.players.length / 12) *
                                    100
                                  }%`,
                                  backgroundColor: getStyleColor(
                                    activeTeamDetails.color
                                  ),
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRosterViewMode("cards")}
                              className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shadow-sm ${
                                rosterViewMode === "cards"
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-50 text-slate-400"
                              }`}
                            >
                              <LayoutGridIcon className="w-4 h-4 sm:w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setRosterViewMode("table")}
                              className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shadow-sm ${
                                rosterViewMode === "table"
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-50 text-slate-400"
                              }`}
                            >
                              <TableIcon className="w-4 h-4 sm:w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-left lg:text-right shrink-0 w-full lg:w-auto">
                        <div className="text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          LIQUIDITY
                        </div>
                        <div className="text-4xl sm:text-7xl font-black italic tracking-tighter leading-none mb-3 sm:mb-6">
                          ₹{activeTeamDetails.budget}
                        </div>
                        <button
                          onClick={() => downloadTeamData(activeTeamDetails)}
                          className="bg-slate-900 text-white px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest border-b-4 border-black active:scale-95 transition-all"
                        >
                          Export
                        </button>
                      </div>
                    </div>

                    {rosterViewMode === "cards" ? (
                      <div className="flex overflow-x-auto gap-4 sm:gap-10 pb-6 sm:pb-10 custom-scrollbar">
                        {activeTeamDetails.players.map((p) => (
                          <div
                            key={p.id}
                            className="min-w-[200px] sm:min-w-[260px] bg-slate-50 p-4 sm:p-6 rounded-[24px] sm:rounded-[36px] border border-slate-100 flex flex-col gap-4 sm:gap-6 shadow-sm hover:shadow-xl transition-all duration-500"
                          >
                            <div className="flex flex-col items-center gap-3 sm:gap-4">
                              <img
                                src={p.image}
                                className="w-24 h-24 sm:w-36 sm:h-36 rounded-[20px] sm:rounded-[32px] object-cover shadow-xl border-4 sm:border-8 border-white"
                                alt="p-img"
                              />
                              <div className="text-center">
                                <div className="text-base sm:text-xl font-black tracking-tight italic uppercase mb-1 truncate max-w-[150px]">
                                  {p.name}
                                </div>
                                <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {p.type} • {p.id}
                                </div>
                              </div>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex justify-between items-center shadow-md">
                              <div>
                                <span className="text-[7px] sm:text-[8px] font-black text-slate-400 block uppercase">
                                  VALUATION
                                </span>
                                <span className="text-sm sm:text-xl font-black italic">
                                  ₹{p.soldPrice}
                                </span>
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={() =>
                                    releasePlayer(activeTeamDetails.id, p.id)
                                  }
                                  className="p-2 sm:p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >
                                  <UserIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {activeTeamDetails.players.length === 0 && (
                          <div className="w-full py-20 sm:py-40 text-center opacity-10">
                            <GavelIcon className="w-12 h-12 sm:w-20 h-20 mx-auto" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-[20px] sm:rounded-[32px] bg-white shadow-xl">
                        <table className="w-full text-left min-w-[600px]">
                          <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                              <th className="px-6 sm:px-10 py-4 sm:py-6 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Asset
                              </th>
                              <th className="px-6 sm:px-10 py-4 sm:py-6 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Role
                              </th>
                              <th className="px-6 sm:px-10 py-4 sm:py-6 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                                Value
                              </th>
                              <th className="px-6 sm:px-10 py-4 sm:py-6 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {activeTeamDetails.players.map((p) => (
                              <tr
                                key={p.id}
                                className="hover:bg-slate-50/30 transition-colors"
                              >
                                <td className="px-6 sm:px-10 py-3 sm:py-5 flex items-center gap-4 sm:gap-6">
                                  <img
                                    src={p.image}
                                    className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border-2 sm:border-4 border-white"
                                    alt="p-img"
                                  />
                                  <div className="font-black text-sm sm:text-lg italic uppercase">
                                    {p.name}
                                  </div>
                                </td>
                                <td className="px-6 sm:px-10 py-3 sm:py-5 text-[10px] sm:text-xs font-bold text-slate-500 uppercase">
                                  {p.type}
                                </td>
                                <td className="px-6 sm:px-10 py-3 sm:py-5 text-right font-black text-2xl sm:text-4xl italic tracking-tighter">
                                  ₹{p.soldPrice}
                                </td>
                                <td className="px-6 sm:px-10 py-3 sm:py-5 text-center">
                                  <button
                                    onClick={() =>
                                      releasePlayer(activeTeamDetails.id, p.id)
                                    }
                                    className="text-red-400 font-black text-[8px] sm:text-[9px] uppercase tracking-widest hover:text-red-600 transition-colors"
                                  >
                                    Terminate
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-40 sm:py-60 opacity-5 grayscale">
                  <LayoutGridIcon className="w-20 h-20 sm:w-40 h-40 mx-auto" />
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      <footer className="h-8 sm:h-10 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-8 z-50 shrink-0">
        <div className="flex gap-4 sm:gap-10 items-center">
          <div className="flex gap-2 sm:gap-3 items-center">
            <div className="w-1.5 h-1.5 sm:w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 tracking-widest uppercase italic">
              ACTIVE
            </span>
          </div>
        </div>
        <div className="text-[7px] sm:text-[9px] font-black text-white/20 tracking-widest uppercase italic truncate ml-4">
          V5.1_RESPONSIVE_DASHBOARD
        </div>
      </footer>
    </div>
  );
};

export default App;
