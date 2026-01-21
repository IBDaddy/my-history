import React, { useState, useEffect, useMemo } from 'react';
import { Edit3, Save, Gamepad2, Loader2, List, Search, X, Camera, ExternalLink, Grid, Calendar, Settings, History, PenTool, Plus, Trash2, Share2, ChevronUp, ChevronDown, Download, Upload, Heart } from 'lucide-react';
import { MASTERPIECE_DB } from './gameDatabase';
import html2canvas from 'html2canvas';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, onSnapshot, getDoc } from "firebase/firestore";

// --- Firebase Initialization (Safe Fallback) ---
// 環境変数が無い場合でもクラッシュしないようにフォールバックを設定
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Pixel Art Styles ---
const PixelStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
    
    :root {
      --pixel-bg: #f0f0f0;
      --pixel-frame: #212529;
      --pixel-accent: #d32f2f;
      --pixel-secondary: #1976d2;
      --pixel-yellow: #fbc02d;
    }

    body {
      font-family: 'DotGothic16', sans-serif;
      background-color: var(--pixel-bg);
      color: var(--pixel-frame);
    }

    .pixel-box {
      background: white;
      border: 4px solid var(--pixel-frame);
      box-shadow: 6px 6px 0px 0px rgba(0,0,0,0.2);
      position: relative;
    }

    .pixel-btn {
      border: 2px solid var(--pixel-frame);
      box-shadow: 4px 4px 0px 0px var(--pixel-frame);
      transition: all 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .pixel-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0px 0px var(--pixel-frame);
    }

    .pixel-input {
      border: 2px solid var(--pixel-frame);
      font-family: 'DotGothic16', sans-serif;
      outline: none;
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
      padding: 1rem;
      backdrop-filter: blur(2px);
    }

    /* Scrollbar for modal lists */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1; 
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #888; 
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #555; 
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.3s ease-out forwards;
    }

    /* Mobile-specific padding for quiz window */
    @media (max-width: 640px) {
      main {
        padding-bottom: 22rem !important;
      }
    }
    }
  `}</style>
);

// MASTERPIECE_DBはgameDatabase.jsからインポート


// --- Constants & Helpers ---

const CONSOLES = [
  { id: 'FC', name: 'FAMICOM', icon: '🎮', color: 'bg-red-100' },
  { id: 'MD', name: 'MEGA DRIVE', icon: '⚫', color: 'bg-gray-800 text-white' },
  { id: 'GB', name: 'GAME BOY', icon: '🔋', color: 'bg-green-100' },
  { id: 'SFC', name: 'SUPER FAMICOM', icon: '👾', color: 'bg-indigo-100' },
  { id: 'PS', name: 'PLAYSTATION', icon: '💿', color: 'bg-gray-200' },
  { id: 'N64', name: 'NINTENDO 64', icon: '🧊', color: 'bg-blue-100' },
  { id: 'DC', name: 'DREAMCAST', icon: '⭐', color: 'bg-blue-200' },
  { id: 'GC', name: 'GAMECUBE', icon: '📦', color: 'bg-purple-200' },
  { id: 'PS2', name: 'PLAYSTATION 2', icon: 'dvd', color: 'bg-blue-900 text-white' },
  { id: 'WII', name: 'Wii', icon: '🕊️', color: 'bg-sky-100' },
  { id: 'GBA', name: 'GAME BOY ADVANCE', icon: '📱', color: 'bg-purple-100' },
  { id: 'DS', name: 'NINTENDO DS', icon: '📒', color: 'bg-gray-100' },
  { id: '3DS', name: 'NINTENDO 3DS', icon: '👓', color: 'bg-red-50' },
];

const createEmptyRanking = (consoleId) => ({
  id: consoleId,
  name: CONSOLES.find(c => c.id === consoleId)?.name || 'UNKNOWN',
  color: CONSOLES.find(c => c.id === consoleId)?.color || 'bg-gray-100',
  games: [
    { rank: 1, title: '', comment: '' },
    { rank: 2, title: '', comment: '' },
    { rank: 3, title: '', comment: '' }
  ]
});

const findGameInfo = (consoleId, title) => {
  if (!title) return null;
  // 簡易検索のため、DBが存在しないハードの場合はnull
  const db = MASTERPIECE_DB[consoleId];
  if (!db) return null;
  
  const normalize = (str) => str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase().replace(/\s+/g, '');
  const searchTitle = normalize(title);

  const game = db.find(g => {
    const dbTitle = normalize(g.title);
    return dbTitle === searchTitle || dbTitle.includes(searchTitle) || searchTitle.includes(dbTitle);
  });
  
  return game || null;
};

const getRankBadgeColor = (rankIndex) => {
  if (rankIndex === 0) return 'bg-yellow-500 text-white border-yellow-700'; 
  if (rankIndex === 1) return 'bg-gray-400 text-white border-gray-600';  
  if (rankIndex === 2) return 'bg-orange-700 text-white border-orange-900'; 
  return 'bg-white text-gray-800 border-gray-400'; 
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [rankings, setRankings] = useState({});
  const [userProfile, setUserProfile] = useState({ 
    birthYear: 1990,
    lifeEvents: [],
    studentSettings: {
      elementary: { startAge: 7, endAge: 12 },
      middle: { startAge: 13, endAge: 15 },
      high: { startAge: 16, endAge: 18 },
      university: { startAge: 19, endAge: 22 }
    }
  }); 
  const [selectedConsoleId, setSelectedConsoleId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [showListModal, setShowListModal] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Selection States
  const [targetRankIndex, setTargetRankIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Title Quiz States
  const [showQuizWindow, setShowQuizWindow] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [showHint, setShowHint] = useState(false);

  // Life Events States
  const [lifeEvents, setLifeEvents] = useState([]);
  const [eventEditModal, setEventEditModal] = useState({ show: false, age: '', event: '' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStudentSettingsModal, setShowStudentSettingsModal] = useState(false);
  const [showSNSShareModal, setShowSNSShareModal] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // 1. Firebase Auth & Data Fetch
  useEffect(() => {
    if (!auth) {
      console.warn("Firebase is not initialized. Using offline mode.");
      // オフラインモード用のダミーデータ（動作確認用）
      setRankings({
        'FC': {
          id: 'FC', name: 'FAMICOM', color: 'bg-red-100',
          games: [{rank:1, title: 'ドラゴンクエストIII', comment:'伝説の始まり', year: 1988}, {rank:2, title: 'スーパーマリオブラザーズ', comment:'', year: 1985}, {rank:3, title:'', comment:''}]
        }
      });
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    
    // ランキング取得
    const qRankings = collection(db, 'artifacts', appId, 'users', user.uid, 'rankings');
    const unsubRankings = onSnapshot(qRankings, (snapshot) => {
      const newRankings = {};
      snapshot.forEach((doc) => {
        newRankings[doc.id] = doc.data();
      });
      setRankings(newRankings);
      setIsLoading(false);
    }, (error) => {
        console.error("Firestore Error:", error);
        setIsLoading(false);
    });

    // プロフィール取得
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setUserProfile(profileData);
          // lifeEventsをuserProfileから取得
          if (profileData.lifeEvents) {
            setLifeEvents(profileData.lifeEvents);
          }
        }
      } catch (e) {
        console.warn("Profile fetch failed:", e);
      }
    };
    fetchProfile();

    return () => unsubRankings();
  }, [user]);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show install button/prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000); // Show after 3 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Handlers
  const handleEdit = (consoleId) => {
    setSelectedConsoleId(consoleId);
    if (!rankings[consoleId]) {
      setRankings(prev => ({ ...prev, [consoleId]: createEmptyRanking(consoleId) }));
    }
    setActiveTab('edit');
  };

  const updateGame = (rankIndex, field, value) => {
    setRankings(prev => {
      const newData = { ...prev };
      // Deep copy to allow nested updates
      newData[selectedConsoleId] = {
        ...newData[selectedConsoleId],
        games: newData[selectedConsoleId].games.map((g, i) => 
          i === rankIndex ? { ...g, [field]: value } : g
        )
      };
      return newData;
    });
  };

  const handleAddRank = () => {
    setRankings(prev => {
      const currentGames = prev[selectedConsoleId].games;
      if (currentGames.length >= 10) return prev;
      const nextRank = currentGames.length + 1;
      const newData = { ...prev };
      newData[selectedConsoleId] = {
        ...newData[selectedConsoleId],
        games: [...currentGames, { rank: nextRank, title: '', comment: '' }]
      };
      return newData;
    });
  };

  const handleRemoveRank = () => {
    setRankings(prev => {
      const currentGames = prev[selectedConsoleId].games;
      if (currentGames.length <= 1) return prev;
      const newData = { ...prev };
      newData[selectedConsoleId] = {
        ...newData[selectedConsoleId],
        games: currentGames.slice(0, -1)
      };
      return newData;
    });
  };

  const handleDeleteRanking = async () => {
    if (!window.confirm(`「${rankings[selectedConsoleId].name}」のランキングを削除してもよろしいですか？`)) {
      return;
    }
    
    if (user && db && selectedConsoleId) {
      try {
        // Firebaseから削除（実装は省略、doc削除）
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'rankings', selectedConsoleId),
          {}
        );
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
    
    setRankings(prev => {
      const newData = { ...prev };
      delete newData[selectedConsoleId];
      return newData;
    });
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setActiveTab('home');
  };

  // Title Quiz Functions
  const startNewQuiz = () => {
    const allGames = [];
    Object.values(MASTERPIECE_DB).forEach(games => {
      allGames.push(...games.filter(g => g.description));
    });
    
    if (allGames.length === 0) return;
    
    const randomGame = allGames[Math.floor(Math.random() * allGames.length)];
    setQuizData(randomGame);
    setQuizAnswer('');
    setQuizResult(null);
    setShowHint(false);
  };

  const scrollToQuiz = () => {
    // クイズウィンドウを表示して新しいクイズを開始
    setShowQuizWindow(true);
    if (!quizData) {
      startNewQuiz();
    }
  };

  const showQuizAnswer = () => {
    if (!quizData) return;
    
    setQuizResult({
      correctTitle: quizData.title,
      genre: quizData.genre,
      year: quizData.year
    });
  };

  const openGameList = (index) => {
    setTargetRankIndex(index);
    setSearchTerm("");
    setShowListModal(true);
  };

  const selectGameFromList = (title) => {
    if (targetRankIndex !== null && selectedConsoleId) {
      updateGame(targetRankIndex, 'title', title);
      setShowListModal(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (user && db && selectedConsoleId) {
      try {
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'rankings', selectedConsoleId),
          rankings[selectedConsoleId]
        );
      } catch (error) {
        console.error("Save error:", error);
      }
    } else {
       // Offline or no auth: just simulate save
       console.log("Saved locally (offline)");
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setIsSaving(false);
    setActiveTab('home');
  };

  const saveProfile = async () => {
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), userProfile);
      } catch (e) {
        console.error(e);
      }
    }
    setShowSettingsModal(false);
  };

  const captureTimeline = async () => {
    try {
      const element = document.querySelector('.timeline-content');
      if (!element) return;

      // スマホ対応：スクロール全体をキャプチャ
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#f0f0f0',
        allowTaint: true,
        useCORS: true,
        scrollY: -window.scrollY,
        windowHeight: element.scrollHeight,
        logging: false
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `人生年表_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      alert('スクリーンショットをダウンロードしました');
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('スクリーンショット撮影に失敗しました');
    }
  };

  const captureAndShareTimeline = async () => {
    try {
      const element = document.querySelector('.timeline-content');
      if (!element) {
        alert('年表が見つかりません');
        return;
      }

      // スマホ対応：スクロール全体をキャプチャ
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#f0f0f0',
        allowTaint: true,
        useCORS: true,
        scrollY: -window.scrollY,
        windowHeight: element.scrollHeight,
        logging: false
      });
      const image = canvas.toDataURL('image/png');

      // キャプチャした画像を保存してモーダルを表示
      setCapturedImage(image);
      setShowSNSShareModal(true);
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('スクリーンショット撮影に失敗しました');
    }
  };

  const downloadCapturedImage = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `人生ゲーム年表_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  const shareToSNSWithImage = (platform) => {
    if (!capturedImage) return;

    const text = `🎮 私の人生ゲーム年表 🎮\n子どもの頃にプレイしたゲームと人生イベントをタイムラインで振り返ってみました。\n#強くてニューゲーム #ゲーム遍歴 #人生年表`;
    const url = window.location.href;

    // まず画像をダウンロード
    downloadCapturedImage();

    // 少し遅延を入れてSNS共有画面を開く
    setTimeout(() => {
      if (platform === 'x') {
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        alert('ダウンロードした画像を添付して投稿してください！');
      } else if (platform === 'line') {
        window.open(`https://line.me/R/msg/text/${encodeURIComponent(text + ' ' + url)}`, '_blank');
        alert('ダウンロードした画像を添付して投稿してください！');
      } else if (platform === 'instagram') {
        alert('画像をダウンロードしました！\nInstagramアプリを開いて、ダウンロードした画像を投稿してください。');
      }
    }, 500);
  };

  const shareToSNS = () => {
    const text = `🎮 強くてニューゲーム 🎮\n自分のゲーム史を振り返る最高のWebアプリ！\nゲーム遍歴と人生のイベントをタイムラインで管理できます。\n#強くてニューゲーム #ゲーム遍歴 #人生年表`;
    const url = window.location.href;

    // SNS共有URLを作成
    const shareUrls = {
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      line: `https://line.me/R/msg/text/${encodeURIComponent(text + ' ' + url)}`,
      instagram: text + '\n' + url
    };

    // ボタンダイアログを表示
    const shareWindow = window.open('', '_blank', 'width=600,height=500');
    if (shareWindow) {
      shareWindow.document.write(`
        <html>
        <head>
          <title>友達にすすめる</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px 20px;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            h2 {
              color: white;
              margin-bottom: 30px;
              font-size: 28px;
              font-weight: 600;
            }
            .buttons-container {
              display: flex;
              flex-direction: column;
              gap: 15px;
              width: 100%;
              max-width: 400px;
            }
            button {
              padding: 16px 24px;
              font-size: 18px;
              font-weight: 600;
              cursor: pointer;
              border: none;
              border-radius: 12px;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              width: 100%;
            }
            button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
            }
            button:active {
              transform: translateY(0);
            }
            .x-btn {
              background-color: #000000;
              color: white;
            }
            .line-btn {
              background-color: #06C755;
              color: white;
            }
            .instagram-btn {
              background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
              color: white;
            }
            .close-btn {
              background-color: #6c757d;
              color: white;
              margin-top: 10px;
            }
            .logo {
              width: 24px;
              height: 24px;
              fill: currentColor;
            }
          </style>
        </head>
        <body>
          <h2>友達にすすめる</h2>
          <div class="buttons-container">
            <button class="x-btn" onclick="window.open('${shareUrls.x}', '_blank')">
              <svg class="logo" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              𝕏 (Twitter) で共有
            </button>
            <button class="line-btn" onclick="window.open('${shareUrls.line}', '_blank')">
              <svg class="logo" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"></path>
              </svg>
              LINE で共有
            </button>
            <button class="instagram-btn" onclick="
              navigator.clipboard.writeText('${shareUrls.instagram.replace(/'/g, "\\'")}').then(() => {
                alert('テキストをコピーしました！\\nInstagramアプリを開いて投稿してください。');
              }).catch(() => {
                prompt('以下のテキストをコピーしてInstagramに投稿してください:', '${shareUrls.instagram.replace(/'/g, "\\'")}');
              });
            ">
              <svg class="logo" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
              </svg>
              Instagram で共有
            </button>
            <button class="close-btn" onclick="window.close()">閉じる</button>
          </div>
        </body>
        </html>
      `);
    }
  };

  const exportData = () => {
    const data = {
      userProfile,
      rankings,
      lifeEvents,
      exportDate: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `人生ゲーム_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result || '{}');
        setUserProfile(data.userProfile || userProfile);
        setRankings(data.rankings || rankings);
        setLifeEvents(data.lifeEvents || []);
        
        // Firestoreに保存
        if (user && db) {
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), data.userProfile || userProfile);
          Object.entries(data.rankings || {}).forEach(([key, value]) => {
            setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'rankings', key), value);
          });
        }
        
        alert('データを読み込みました');
        setShowExportModal(false);
      } catch (error) {
        console.error('Import failed:', error);
        alert('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  // Timeline Data Generation
  const timelineData = useMemo(() => {
    const flatGames = [];
    Object.values(rankings).forEach(ranking => {
      ranking.games.forEach((game, idx) => {
        if (!game.title) return;
        const info = findGameInfo(ranking.id, game.title);
        const year = info && info.year ? parseInt(info.year) : 9999;
        
        flatGames.push({
          ...game,
          consoleId: ranking.id,
          consoleName: ranking.name,
          consoleIcon: CONSOLES.find(c => c.id === ranking.id)?.icon,
          rankIndex: idx,
          year: year,
          genre: info?.genre || 'UNKNOWN'
        });
      });
    });
    // Sort by year, then by console
    flatGames.sort((a, b) => a.year - b.year);
    
    // Group by year
    const grouped = {};
    flatGames.forEach(game => {
      const y = game.year === 9999 ? '時期不明' : game.year;
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(game);
    });
    return grouped;
  }, [rankings]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 font-dot-gothic bg-gray-100">
        <PixelStyles />
        <Loader2 className="w-12 h-12 animate-spin text-gray-800" />
        <p>読み込んでいます...</p>
      </div>
    );
  }

  // --- Components for Modals ---

  const GameListModal = () => {
      const consoleDb = MASTERPIECE_DB[selectedConsoleId] || [];
      const filtered = consoleDb.filter(g => 
          g.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
          <div className="modal-overlay" onClick={() => setShowListModal(false)}>
              <div className="pixel-box bg-white w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-3 bg-gray-800 text-white flex justify-between items-center border-b-4 border-black">
                      <h3 className="font-bold text-lg">名作リスト ({CONSOLES.find(c => c.id === selectedConsoleId)?.name})</h3>
                      <button onClick={() => setShowListModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-3 border-b-2 border-gray-200">
                      <div className="relative">
                          <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                          <input 
                              type="text" 
                              placeholder="タイトルを検索..." 
                              className="pixel-input w-full pl-8 p-2"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                          {filtered.length}件のゲームが見つかりました
                      </div>
                  </div>
                  <div className="overflow-y-auto p-0 custom-scrollbar flex-grow">
                      {filtered.length === 0 ? (
                          <div className="text-center text-gray-400 py-16">見つかりません<br/><span className="text-xs">別のキーワードで検索してください</span></div>
                      ) : (
                          filtered.map((game, i) => (
                              <div
                                  key={i}
                                  className="w-full text-left p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-3 group hover:bg-yellow-50 transition-colors"
                              >
                                  <div className="flex justify-between items-start gap-2 sm:gap-4">
                                      <span className="font-bold text-gray-800 text-sm sm:text-base break-words">{game.title}</span>
                                      <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600 whitespace-nowrap flex-shrink-0">{game.year}年</span>
                                  </div>
                                  <div className="flex gap-2 text-xs flex-wrap">
                                      {game.genre && (
                                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{game.genre}</span>
                                      )}
                                  </div>
                                  {game.description && (
                                      <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                                          {game.description}
                                      </div>
                                  )}
                                  <div className="flex gap-2 pt-2 flex-col sm:flex-row">
                                      <button 
                                          onClick={() => selectGameFromList(game.title)}
                                          className="flex-1 pixel-btn bg-green-400 text-black px-2 py-2 text-xs font-bold hover:bg-green-300"
                                      >
                                          このゲームを選ぶ
                                      </button>
                                      <button 
                                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(game.title)}`, '_blank')}
                                          className="flex-1 pixel-btn bg-blue-400 text-black px-2 py-2 text-xs font-bold hover:bg-blue-300 flex items-center justify-center gap-1"
                                      >
                                          <ExternalLink size={12} /> Google検索
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const getAgeGroup = (age) => {
    const settings = userProfile.studentSettings || {
      elementary: { startAge: 7, endAge: 12 },
      middle: { startAge: 13, endAge: 15 },
      high: { startAge: 16, endAge: 18 },
      university: { startAge: 19, endAge: 22 }
    };

    if (age < settings.elementary.startAge) {
      return { name: '幼年期', color: 'bg-pink-100', borderColor: 'border-pink-300' };
    }
    if (age >= settings.elementary.startAge && age <= settings.elementary.endAge) {
      return { name: '小学生', color: 'bg-blue-100', borderColor: 'border-blue-300' };
    }
    if (age >= settings.middle.startAge && age <= settings.middle.endAge) {
      return { name: '中学生', color: 'bg-green-100', borderColor: 'border-green-300' };
    }
    if (age >= settings.high.startAge && age <= settings.high.endAge) {
      return { name: '高校生', color: 'bg-yellow-100', borderColor: 'border-yellow-300' };
    }
    if (age >= settings.university.startAge && age <= settings.university.endAge) {
      return { name: '大学生', color: 'bg-purple-100', borderColor: 'border-purple-300' };
    }
    return { name: '人生', color: 'bg-gray-100', borderColor: 'border-gray-300' };
  };

  const addLifeEvent = () => {
    if (eventEditModal.age && eventEditModal.event) {
      const age = parseInt(eventEditModal.age);
      // 年齢が0-100の範囲内かチェック
      if (age < 0 || age > 100) {
        alert('年齢は0〜100の範囲で入力してください');
        return;
      }
      const newEvent = { age, event: eventEditModal.event };
      const updatedEvents = [...lifeEvents, newEvent].sort((a, b) => a.age - b.age);
      setLifeEvents(updatedEvents);
      setEventEditModal({ show: false, age: '', event: '' });

      // プロフィールに保存
      if (user && db) {
        setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), {
          ...userProfile,
          lifeEvents: updatedEvents
        });
      } else {
        // ローカル保存用
        setUserProfile(prev => ({ ...prev, lifeEvents: updatedEvents }));
      }
    }
  };

  const deleteLifeEvent = (index) => {
    const newEvents = lifeEvents.filter((_, i) => i !== index);
    setLifeEvents(newEvents);
    
    // プロフィールに保存
    if (user && db) {
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), {
        ...userProfile,
        lifeEvents: newEvents
      });
    }
  };

  const TimelineModal = () => {
    const allYears = [...new Set([...Object.keys(timelineData), ...lifeEvents.map(e => (userProfile.birthYear + e.age).toString())].sort((a, b) => parseInt(a) - parseInt(b)))];
    
    return (
      <div className="modal-overlay" onClick={() => setShowTimelineModal(false)}>
          <div className="pixel-box bg-white w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 bg-gray-900 text-white border-b-4 border-black flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                      <History className="text-yellow-400" />
                      <h2 className="text-xl font-bold">人生ゲーム年表</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setEventEditModal({ show: true, age: '', event: '' })} className="pixel-btn bg-green-400 text-black px-2 py-1 text-xs font-bold hover:bg-green-300">
                          + イベント追加
                      </button>
                      <button onClick={captureTimeline} title="スクリーンショット" className="pixel-btn bg-orange-400 text-black px-2 py-1 text-xs font-bold hover:bg-orange-300 flex items-center gap-1">
                          <Camera size={14} /> 撮影
                      </button>
                      <button onClick={captureAndShareTimeline} title="SNSで共有" className="pixel-btn bg-blue-400 text-black px-2 py-1 text-xs font-bold hover:bg-blue-300 flex items-center gap-1">
                          <Share2 size={14} /> 共有
                      </button>
                      <button onClick={() => setShowTimelineModal(false)}><X/></button>
                  </div>
              </div>

              {/* 学年凡例 */}
              <div className="px-6 py-3 bg-white border-b-2 border-gray-200 flex gap-4 flex-wrap text-xs font-bold">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-pink-100 border border-pink-300"></div><span>幼年期（0-{userProfile.studentSettings?.elementary.startAge - 1}歳）</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-100 border border-blue-300"></div><span>小学生（{userProfile.studentSettings?.elementary.startAge}-{userProfile.studentSettings?.elementary.endAge}歳）</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-300"></div><span>中学生（{userProfile.studentSettings?.middle.startAge}-{userProfile.studentSettings?.middle.endAge}歳）</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-300"></div><span>高校生（{userProfile.studentSettings?.high.startAge}-{userProfile.studentSettings?.high.endAge}歳）</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-100 border border-purple-300"></div><span>大学生（{userProfile.studentSettings?.university.startAge}-{userProfile.studentSettings?.university.endAge}歳）</span></div>
              </div>

              <div className="overflow-auto flex-grow p-3 sm:p-6 bg-gray-50 timeline-content flex items-center justify-center">
                  {allYears.length === 0 ? (
                      <div className="text-center text-gray-500">ランキングを作成するか、<br/>イベントを追加するとここに年表が表示されます。</div>
                  ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:flex gap-2 sm:gap-4 auto-rows-max">
                          {allYears.map((year) => {
                              const age = parseInt(year) - userProfile.birthYear;
                              const schoolGroup = getAgeGroup(age);
                              const yearEvents = timelineData[year] || [];
                              const customEvents = lifeEvents.filter(e => userProfile.birthYear + e.age === parseInt(year));
                              
                              return (
                                  <div key={year} className={`flex-shrink-0 w-28 sm:w-48 border-2 sm:border-4 ${schoolGroup.borderColor} ${schoolGroup.color} p-2 sm:p-4 rounded-lg shadow-md`}>
                                      <div className="font-bold text-center mb-2 sm:mb-3 pb-1 sm:pb-2 border-b-2 border-gray-400">
                                          <div className="text-xs sm:text-lg">{year}年</div>
                                          <div className="text-[10px] sm:text-xs text-gray-600 font-normal">{age}歳</div>
                                          <div className="text-[9px] sm:text-xs bg-white px-1 sm:px-2 py-0.5 sm:py-1 rounded mt-0.5 sm:mt-1 font-bold">{schoolGroup.name}</div>
                                      </div>
                                      
                                      <div className="space-y-1 sm:space-y-2 max-h-40 sm:max-h-96 overflow-y-auto text-[8px] sm:text-xs">
                                          {/* ゲーム */}
                                          {yearEvents.map((game, idx) => (
                                              <div key={`game-${idx}`} className="pixel-box p-1 sm:p-2 bg-white border-2">
                                                  <div className="font-bold text-[7px] sm:text-sm mb-0.5 sm:mb-1 line-clamp-2">{game.title}</div>
                                                  <div className="text-gray-600 text-[7px] sm:text-[10px]">{game.consoleIcon}</div>
                                                  {game.comment && <div className="text-[7px] sm:text-[10px] text-gray-500 mt-0.5 italic line-clamp-1">"{game.comment}"</div>}
                                              </div>
                                          ))}
                                          
                                          {/* カスタムイベント */}
                                          {customEvents.map((evt, idx) => (
                                              <div key={`event-${idx}`} className="bg-red-100 border-2 border-red-300 p-1 sm:p-2 rounded relative group">
                                                  <div className="font-bold text-[7px] sm:text-sm mb-0.5 line-clamp-2">{evt.event}</div>
                                                  <button 
                                                      onClick={() => deleteLifeEvent(lifeEvents.indexOf(evt))}
                                                      className="absolute top-0.5 right-0.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                      <X size={12} />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>

          {/* イベント追加モーダル */}
          {eventEditModal.show && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={() => setEventEditModal({ show: false, age: '', event: '' })}>
                  <div className="pixel-box bg-white p-6 w-96 border-4 border-black" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold mb-4">人生イベントを追加</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold mb-2">年齢</label>
                              <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="pixel-input w-full p-2"
                                  value={eventEditModal.age}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    // 最大3桁まで許可（0-999）
                                    if (val.length <= 3) {
                                      setEventEditModal(prev => ({ ...prev, age: val }));
                                    }
                                  }}
                                  placeholder="例：16"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold mb-2">イベント内容</label>
                              <textarea
                                  rows={3}
                                  className="pixel-input w-full p-2"
                                  value={eventEditModal.event}
                                  onChange={(e) => setEventEditModal(prev => ({ ...prev, event: e.target.value }))}
                                  placeholder="例：部活の友達とスマブラにはまる"
                              />
                          </div>
                          <div className="flex gap-2">
                              <button
                                  onClick={() => setEventEditModal({ show: false, age: '', event: '' })}
                                  className="pixel-btn flex-1 bg-gray-300 py-2 font-bold hover:bg-gray-200"
                              >
                                  キャンセル
                              </button>
                              <button
                                  onClick={addLifeEvent}
                                  className="pixel-btn flex-1 bg-green-400 py-2 font-bold hover:bg-green-300"
                              >
                                  追加
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    );
  };

  const SettingsModal = () => (
    <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
      <div className="pixel-box bg-white w-full max-w-md p-0 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gray-800 text-white p-3 font-bold border-b-4 border-black sticky top-0">設定</div>
        <div className="p-6 space-y-6">
           <div>
             <label className="block text-sm font-bold mb-2">生まれ年 (年齢計算用)</label>
             <input
               type="text"
               inputMode="numeric"
               pattern="[0-9]*"
               className="pixel-input w-full p-2 text-lg"
               value={userProfile.birthYear}
               onChange={(e) => {
                 const val = e.target.value.replace(/[^0-9]/g, '');
                 // 最大4桁まで許可
                 if (val.length <= 4) {
                   setUserProfile(prev => ({...prev, birthYear: val === '' ? '' : parseInt(val)}));
                 }
               }}
               maxLength="4"
               placeholder="例：1990"
             />
           </div>

           <div className="border-t-2 pt-4">
             <h3 className="font-bold mb-3 flex items-center gap-2">
               <Calendar size={16} /> 学生時代の年齢設定
             </h3>
             
             <div className="space-y-3 text-sm">
               <div>
                 <label className="block font-bold mb-1">小学生</label>
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">開始年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.elementary.startAge || 7}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               elementary: {
                                 ...prev.studentSettings.elementary,
                                 startAge: val === '' ? 7 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">終了年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.elementary.endAge || 12}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               elementary: {
                                 ...prev.studentSettings.elementary,
                                 endAge: val === '' ? 12 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block font-bold mb-1">中学生</label>
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">開始年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.middle.startAge || 13}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               middle: {
                                 ...prev.studentSettings.middle,
                                 startAge: val === '' ? 13 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">終了年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.middle.endAge || 15}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               middle: {
                                 ...prev.studentSettings.middle,
                                 endAge: val === '' ? 15 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block font-bold mb-1">高校生</label>
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">開始年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.high.startAge || 16}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               high: {
                                 ...prev.studentSettings.high,
                                 startAge: val === '' ? 16 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">終了年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.high.endAge || 18}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               high: {
                                 ...prev.studentSettings.high,
                                 endAge: val === '' ? 18 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                 </div>
               </div>

               <div>
                 <label className="block font-bold mb-1">大学生/浪人</label>
                 <div className="flex gap-2">
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">開始年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.university.startAge || 19}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               university: {
                                 ...prev.studentSettings.university,
                                 startAge: val === '' ? 19 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                   <div className="flex-1">
                     <span className="text-xs text-gray-600">終了年齢</span>
                     <input
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       className="pixel-input w-full p-1 text-sm"
                       value={userProfile.studentSettings?.university.endAge || 22}
                       onChange={(e) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         if (val.length <= 3) {
                           setUserProfile(prev => ({
                             ...prev,
                             studentSettings: {
                               ...prev.studentSettings,
                               university: {
                                 ...prev.studentSettings.university,
                                 endAge: val === '' ? 22 : parseInt(val)
                               }
                             }
                           }));
                         }
                       }}
                     />
                   </div>
                 </div>
               </div>
             </div>
           </div>

           <div className="border-t-2 pt-4">
             <h3 className="font-bold mb-2 flex items-center gap-2">
               <Download size={16} /> データ管理
             </h3>
             <div className="space-y-2">
               <button
                 onClick={exportData}
                 className="pixel-btn w-full bg-green-400 text-black font-bold py-2 hover:bg-green-300 text-sm flex items-center justify-center gap-2"
               >
                 <Download size={14} /> データをダウンロード
               </button>
               <label className="block">
                 <input
                   type="file"
                   accept=".json"
                   onChange={importData}
                   className="hidden"
                 />
                 <button
                   onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                   className="pixel-btn w-full bg-blue-400 text-black font-bold py-2 hover:bg-blue-300 text-sm flex items-center justify-center gap-2"
                 >
                   <Upload size={14} /> データをアップロード
                 </button>
               </label>
             </div>
           </div>

           <div className="border-t-2 pt-4">
             <h3 className="font-bold mb-3 flex items-center gap-2">
               <Heart size={16} className="text-red-500" /> 開発者を支援する
             </h3>
             <p className="text-xs text-gray-600 mb-3">
               このアプリを気に入っていただけましたら、開発の継続を支援していただけると嬉しいです！
             </p>
             <button
               onClick={() => window.open('https://buymeacoffee.com/ibdaddy', '_blank')}
               className="pixel-btn w-full bg-yellow-400 text-black font-bold py-3 hover:bg-yellow-300 text-sm flex items-center justify-center gap-2"
             >
               <span className="text-lg">☕</span> Buy Me a Coffee
             </button>
           </div>

           <button onClick={saveProfile} className="pixel-btn w-full bg-blue-500 text-white font-bold py-3 hover:bg-blue-400">
             保存する
           </button>
        </div>
      </div>
    </div>
  );

  const ExportModal = () => (
    <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
      <div className="pixel-box bg-white w-full max-w-sm p-0" onClick={e => e.stopPropagation()}>
        <div className="bg-gray-800 text-white p-3 font-bold border-b-4 border-black">データ管理</div>
        <div className="p-6 space-y-4">
           <p className="text-sm text-gray-700">データのエクスポート/インポートを実行します。</p>
           <div className="space-y-2">
             <button
               onClick={exportData}
               className="pixel-btn w-full bg-green-400 text-black font-bold py-2 hover:bg-green-300 flex items-center justify-center gap-2"
             >
               <Download size={16} /> データをダウンロード
             </button>
             <label className="block">
               <input
                 type="file"
                 accept=".json"
                 onChange={importData}
                 className="hidden"
               />
               <button
                 onClick={(e) => {
                   const input = e.currentTarget.parentElement?.querySelector('input[type="file"]');
                   input?.click();
                 }}
                 className="pixel-btn w-full bg-blue-400 text-black font-bold py-2 hover:bg-blue-300 flex items-center justify-center gap-2"
               >
                 <Upload size={16} /> データをアップロード
               </button>
             </label>
           </div>
           <button
             onClick={() => setShowExportModal(false)}
             className="pixel-btn w-full bg-gray-300 text-black font-bold py-2 hover:bg-gray-200"
           >
             閉じる
           </button>
        </div>
      </div>
    </div>
  );

  const SNSShareModal = () => (
    <div className="modal-overlay" onClick={() => setShowSNSShareModal(false)}>
      <div className="pixel-box bg-white w-full max-w-md p-0" onClick={e => e.stopPropagation()}>
        <div className="bg-gray-900 text-white p-4 font-bold border-b-4 border-black flex justify-between items-center">
          <h3 className="text-lg">SNSで共有する</h3>
          <button onClick={() => setShowSNSShareModal(false)}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 mb-4">年表のスクリーンショットをダウンロードして、SNSで共有します。</p>

          {capturedImage && (
            <div className="mb-4 border-2 border-gray-300 rounded overflow-hidden">
              <img src={capturedImage} alt="年表プレビュー" className="w-full" />
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => shareToSNSWithImage('x')}
              className="pixel-btn w-full bg-black text-white font-bold py-3 hover:bg-gray-800 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              𝕏 (Twitter) で共有
            </button>

            <button
              onClick={() => shareToSNSWithImage('line')}
              className="pixel-btn w-full bg-[#06C755] text-white font-bold py-3 hover:bg-[#05b34c] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"></path>
              </svg>
              LINE で共有
            </button>

            <button
              onClick={() => shareToSNSWithImage('instagram')}
              className="pixel-btn w-full text-white font-bold py-3 flex items-center justify-center gap-2"
              style={{background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'}}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
              </svg>
              Instagram で共有
            </button>

            <button
              onClick={downloadCapturedImage}
              className="pixel-btn w-full bg-gray-600 text-white font-bold py-3 hover:bg-gray-500 flex items-center justify-center gap-2"
            >
              <Download size={18} />
              画像だけダウンロード
            </button>
          </div>

          <button
            onClick={() => setShowSNSShareModal(false)}
            className="pixel-btn w-full bg-gray-300 text-black font-bold py-2 hover:bg-gray-200 mt-4"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 relative bg-[#f0f0f0]">
      <PixelStyles />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white p-3 border-b-4 border-gray-700 shadow-lg">
        <div className="max-w-md mx-auto flex justify-center items-center relative">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Gamepad2 className="w-6 h-6 text-yellow-400" />
            <h1 className="text-lg font-bold tracking-wider text-yellow-400 drop-shadow-md">
              強くてニューゲーム
            </h1>
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="absolute right-0 p-2 hover:bg-gray-700 rounded-full">
            <Settings size={20} className="text-gray-300" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 space-y-6" style={{ paddingBottom: '20rem' }}>
        <style>{`
          @media (min-width: 640px) {
            main {
              padding-bottom: 1.5rem;
              padding-right: 1rem;
            }
          }
        `}</style>
        
        {/* VIEW MODE: HOME */}
        {activeTab === 'home' && (
          <div className="relative">
            {/* ドラクエ風メッセージウィンドウ - 全画面オーバーレイ */}
            {showQuizWindow && (
            <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={() => setShowQuizWindow(false)}>
              <div className="w-full sm:w-[600px] max-w-3xl pixel-box bg-gray-900 text-white border-4 border-yellow-400 p-6 shadow-lg relative" onClick={e => e.stopPropagation()}>
                {/* 閉じるボタン - 内側に配置 */}
                <button
                  onClick={() => setShowQuizWindow(false)}
                  className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-300 font-bold text-2xl w-8 h-8 flex items-center justify-center"
                  title="クイズウィンドウを閉じる"
                >
                  ✕
                </button>

                {/* タイトル */}
                <div className="text-right text-sm font-bold text-yellow-400 mb-4 border-b-2 border-yellow-400 pb-2 tracking-widest pr-10">
                  ≡ クイズ
                </div>
              
              {!quizData ? (
                <button 
                  onClick={startNewQuiz}
                  className="w-full pixel-btn bg-yellow-400 text-black font-bold py-2 hover:bg-yellow-300 text-sm tracking-wide"
                >
                  新しいクイズ
                </button>
              ) : (
                <div className="space-y-3 text-sm">
                  {/* 説明文表示 */}
                  <div className="bg-black border-2 border-yellow-400 p-3 rounded-sm">
                    <p className="text-yellow-300 text-sm mb-2">このゲームは？</p>
                    <p className="text-yellow-100 leading-relaxed text-sm">"{quizData.description}"</p>
                  </div>

                  {/* ヒント表示 */}
                  <div>
                    {!showHint ? (
                      <button
                        onClick={() => setShowHint(true)}
                        className="w-full pixel-btn bg-gray-600 text-yellow-300 px-3 py-2 text-sm font-bold hover:bg-gray-500"
                      >
                        💡 ヒント表示
                      </button>
                    ) : (
                      <div className="bg-black border-2 border-yellow-400 p-3 rounded-sm text-yellow-100 text-sm">
                        <span className="text-yellow-300">◆{quizData.genre}◆</span><br/>
                        <span className="text-yellow-300">{quizData.year}年</span>
                      </div>
                    )}
                  </div>

                  {!quizResult ? (
                    /* 正解を見るボタン */
                    <button
                      onClick={showQuizAnswer}
                      className="w-full pixel-btn bg-yellow-500 text-black px-2 py-3 font-bold text-sm hover:bg-yellow-400"
                    >
                      正解を見る
                    </button>
                  ) : (
                    /* 正解表示 */
                    <div>
                      <div className="border-2 p-3 rounded-sm bg-yellow-900 border-yellow-400 text-yellow-100">
                        <p className="font-bold mb-2 text-yellow-300 text-sm">
                          正解
                        </p>
                        <p className="text-base font-bold">
                          <span className="text-yellow-200">{quizResult.correctTitle}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(quizResult.correctTitle)}`, '_blank')}
                          className="flex-1 pixel-btn bg-green-600 text-white px-2 py-2 font-bold text-sm hover:bg-green-500 flex items-center justify-center gap-1"
                        >
                          <ExternalLink size={14} /> Google検索
                        </button>
                        <button
                          onClick={startNewQuiz}
                          className="flex-1 pixel-btn bg-blue-600 text-white px-2 py-2 font-bold text-sm hover:bg-blue-500"
                        >
                          次へ →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            )}

            {/* メインコンテンツ */}
            <div>
              <div className="text-center mb-6 pt-2">
                {/* ドラクエ風メッセージボックス */}
                <div className="bg-black text-white border-4 border-white p-6 mb-6 w-full max-w-md mx-auto" style={{boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.3)'}}>
                  <p className="text-base font-bold leading-relaxed mb-4 text-center">
                    君のゲーム史を<br/>
                    きいてもよろしいですか?
                  </p>
                  <div className="flex justify-center gap-12">
                    <p className="text-white font-bold">▶はい</p>
                    <p className="text-white font-bold">　いいえ</p>
                  </div>
                </div>

                {/* ナビゲーション - 8bit風 */}
                <div className="flex gap-3 justify-center mb-6">
                  {Object.keys(rankings).length > 0 && (
                    <button
                      onClick={() => setShowTimelineModal(true)}
                      className="pixel-btn bg-green-500 text-white font-bold py-2 px-3 text-xs hover:bg-green-400 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] tracking-widest"
                    >
                      📅 年表
                    </button>
                  )}
                  <button
                    onClick={() => scrollToQuiz()}
                    className="pixel-btn bg-blue-500 text-white font-bold py-2 px-3 text-xs hover:bg-blue-400 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] tracking-widest"
                  >
                    🎮 クイズ
                  </button>
                </div>
              </div>
              

              <div className="space-y-8 animate-slideUp mt-6">
              {Object.values(rankings).map((ranking) => (
                <div key={ranking.id} className="pixel-box p-0 overflow-hidden">
                  <div className={`p-3 flex justify-between items-center border-b-4 border-black ${ranking.color}`}>
                    <div className="flex items-center gap-2">
                         <span className="text-xl">{CONSOLES.find(c=>c.id === ranking.id)?.icon}</span>
                         <span className="font-bold text-lg tracking-widest text-black">{ranking.name}</span>
                    </div>
                    <button onClick={() => handleEdit(ranking.id)} className="p-1 hover:bg-white/50 rounded border-2 border-transparent hover:border-black transition-all">
                      <Edit3 size={18} className="text-black" />
                    </button>
                  </div>
                  <div className="p-4 bg-white space-y-4">
                    {ranking.games.map((game, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] ${getRankBadgeColor(idx)}`}>
                            {game.rank}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-bold text-lg leading-tight mb-1 truncate">
                              {game.title || <span className="text-gray-300 text-sm">---</span>}
                            </h3>
                            {game.comment && (
                              <div className="text-sm text-gray-500 break-words leading-snug">
                                {game.comment}
                              </div>
                            )}
                          </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="text-center mt-8 mb-4 border-t-4 border-dotted border-gray-300 pt-6">
                  <p className="text-gray-500 font-bold mb-4 text-sm">▼ 新しいハードのランキングを作る ▼</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pb-8">
                {CONSOLES.filter(c => !rankings[c.id]).map(console => (
                  <button
                    key={console.id}
                    onClick={() => handleEdit(console.id)}
                    className="pixel-btn bg-white p-2 flex flex-col items-center gap-1 hover:bg-yellow-50 relative group h-24 justify-center"
                  >
                    <div className="absolute top-1 right-1 text-gray-300 group-hover:text-black">
                      <Plus size={14} />
                    </div>
                    <span className="text-3xl mb-1">{console.icon}</span>
                    <span className="text-[10px] font-bold text-center leading-tight">{console.name}</span>
                  </button>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* VIEW MODE: EDIT */}
        {activeTab === 'edit' && selectedConsoleId && rankings[selectedConsoleId] && (
          <div className="animate-slideUp pb-24">
            <div className="flex items-center justify-between mb-4 sticky top-[70px] z-30 bg-[#f0f0f0] py-2 border-b-2 border-gray-300">
              <button onClick={() => setActiveTab('home')} className="pixel-btn bg-gray-200 px-3 py-2 text-sm font-bold">
                ← キャンセル
              </button>
              <h2 className="text-lg font-bold flex items-center gap-2">
                 {CONSOLES.find(c => c.id === selectedConsoleId)?.icon}
                 {CONSOLES.find(c => c.id === selectedConsoleId)?.name}
              </h2>
              <button onClick={handleDeleteRanking} className="pixel-btn bg-red-300 px-3 py-2 text-sm font-bold hover:bg-red-400 flex items-center gap-1">
                <Trash2 size={16} /> 削除
              </button>
            </div>

            <div className="space-y-6">
              {rankings[selectedConsoleId].games.map((game, idx) => (
                <div key={idx} className="pixel-box p-4 relative bg-white">
                  <div className={`absolute -top-3 -left-3 px-3 py-1 font-bold border-2 border-black shadow-sm text-sm ${getRankBadgeColor(idx)}`}>
                     {idx + 1}位
                  </div>
                  
                  <div className="mt-2 space-y-3">
                    {/* Game Title Input */}
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-xs text-gray-500 font-bold">タイトル</label>
                        <button 
                          onClick={() => openGameList(idx)}
                          className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 border border-blue-200 hover:bg-blue-100 active:translate-y-0.5 rounded"
                        >
                          <List size={12} /> 候補から選ぶ
                        </button>
                      </div>
                      <input
                          type="text"
                          value={game.title}
                          onChange={(e) => updateGame(idx, 'title', e.target.value)}
                          placeholder={idx < 3 ? "例：ドラクエV" : "隠れた名作..."}
                          className="pixel-input w-full p-2 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Comment Input */}
                    <div>
                        <label className="block text-xs mb-1 text-gray-500 font-bold">思い出の一言</label>
                        <textarea
                          rows={2}
                          value={game.comment}
                          onChange={(e) => updateGame(idx, 'comment', e.target.value)}
                          placeholder="あの夏、友達とやりこんだ..."
                          className="pixel-input w-full p-2 bg-gray-50 text-sm focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Google Link & Trash */}
                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 mt-2">
                        {game.title ? (
                          <a 
                             href={`https://www.google.com/search?q=${CONSOLES.find(c => c.id === selectedConsoleId)?.name}+${game.title}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600"
                          >
                             <ExternalLink size={12} /> Google検索
                          </a>
                        ) : <span></span>}
                        
                        {/* Only show delete if it's the last item and we have more than 1 item */}
                        {idx === rankings[selectedConsoleId].games.length - 1 && rankings[selectedConsoleId].games.length > 1 && (
                            <button 
                                onClick={handleRemoveRank}
                                className="text-red-400 hover:text-red-600 p-1"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Rank Button */}
              {rankings[selectedConsoleId].games.length < 10 && (
                  <button 
                    onClick={handleAddRank}
                    className="w-full py-3 border-4 border-dashed border-gray-300 text-gray-400 font-bold hover:bg-white hover:text-gray-600 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} /> 順位を追加する
                  </button>
              )}
            </div>

            {/* Bottom Floating Save Bar */}
            <div className="fixed bottom-4 left-0 right-0 px-4">
                <div className="max-w-md mx-auto">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="pixel-btn w-full bg-yellow-400 text-black text-lg font-bold py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        保存して戻る
                    </button>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slideUp z-50 border-2 border-yellow-400">
           <Save size={18} className="text-yellow-400"/>
           <span className="font-bold">セーブしました！</span>
        </div>
      )}

      {/* Modals */}
      {showListModal && <GameListModal />}
      {showTimelineModal && <TimelineModal />}
      {showSettingsModal && <SettingsModal />}
      {showExportModal && <ExportModal />}
      {showSNSShareModal && <SNSShareModal />}

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slideUp">
          <div className="pixel-box bg-yellow-400 border-4 border-black p-4 shadow-lg max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-3xl">📱</div>
              <div className="flex-grow">
                <h3 className="font-bold text-black mb-1">アプリをインストール</h3>
                <p className="text-sm text-gray-800 mb-3">ホーム画面に追加して、いつでもアクセスできます！</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="pixel-btn bg-black text-yellow-400 font-bold py-2 px-4 text-sm hover:bg-gray-800 flex-1"
                  >
                    インストール
                  </button>
                  <button
                    onClick={() => setShowInstallPrompt(false)}
                    className="pixel-btn bg-gray-600 text-white font-bold py-2 px-4 text-sm hover:bg-gray-500"
                  >
                    後で
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
