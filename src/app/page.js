'use client'
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultEvmConfig } from '@web3modal/ethers/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import confetti from 'canvas-confetti';
import abi from '../constants/abi.json';
import { contractAddress } from '../constants';

// 1. WalletConnect Proje Bilgileri (Cloud.walletconnect.com'dan ücretsiz ID alabilirsin)
const projectId = 'PROJE_ID_BURAYA_GELECEK'; // Buraya kendi projectId'ni yapıştır

// 2. Base Ana Ağ Konfigürasyonu
const mainnet = {
  chainId: 8453,
  name: 'Base',
  currency: 'ETH',
  explorerUrl: 'https://basescan.org',
  rpcUrl: 'https://mainnet.base.org'
};

const metadata = {
  name: 'EthSpin',
  description: 'Ethereum Price Roulette',
  url: 'https://ethspin-web.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersConfig = defaultEvmConfig({
  metadata,
  enableEmail: true, 
  enableSmartAccounts: true,
  enableAnalytics: true
});

// Modal oluşturma
createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: true,
  themeMode: 'dark'
});

export default function Home() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeBets, setActiveBets] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [betAmount, setBetAmount] = useState(10);

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const fetchLivePrice = useCallback(async () => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&t=${Date.now()}`);
      const data = await res.json();
      if (data.ethereum) setEthPrice(data.ethereum.usd);
    } catch (err) { console.error("Fiyat hatası:", err); }
  }, []);

  const fetchBalance = useCallback(async (userAddress) => {
    if (!userAddress || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const b = await contract.userChipBalance(userAddress);
      setBalance(Number(b)); 
    } catch (err) { console.error("Bakiye hatası:", err); }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = new Date().getSeconds();
      setTimeLeft(60 - seconds);
      if (seconds === 0) {
        fetchLivePrice();
        if (!loading) {
          setActiveBets({});
          setIsLocked(false);
        }
      }
    }, 1000);
    fetchLivePrice();
    return () => clearInterval(timer);
  }, [fetchLivePrice, loading]);

  const getRangeData = (num) => {
    const step = 10; 
    const diff = (num - 18) * step;
    const start = Math.floor(ethPrice + diff);
    const end = start + 9;
    return { start, end };
  };

  const handleBoxClick = (num) => {
    if (isLocked || timeLeft < 10) return;
    setActiveBets(prev => {
      const currentBet = prev[num] || 0;
      if (currentBet > 0) {
        const { [num]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [num]: betAmount };
    });
  };

  const totalBetAmount = Object.values(activeBets).reduce((a, b) => a + b, 0);

  const confirmAndPlay = async () => {
    if (totalBetAmount === 0) return toast.warn("Lütfen aralık seçin!");
    if (balance < totalBetAmount) return toast.error("Yetersiz bakiye!");
    
    setIsLocked(true);
    setLoading(true);
    setBalance(prev => prev - totalBetAmount);

    setTimeout(async () => {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&t=${Date.now()}`);
      const data = await res.json();
      const actualPrice = data.ethereum.usd;

      const diffPrice = actualPrice - ethPrice;
      const targetIdx = Math.max(0, Math.min(36, Math.floor((diffPrice / 10) + 18)));
      
      const segment = 360 / 37;
      const newRotation = rotation + 1800 + (targetIdx * segment - (rotation % 360));
      setRotation(newRotation);

      setTimeout(() => {
        const betOnWinner = activeBets[targetIdx] || 0;
        const wonAmount = betOnWinner * 36;
        
        if (wonAmount > 0) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#EAB308', '#22C55E', '#ffffff'] });
          toast.success(`🎉 TEBRİKLER! ${wonAmount} Chip Kazandınız!`);
          setBalance(prev => prev + wonAmount);
        } else {
          toast.error(`📉 Kaybettiniz. Gerçek Fiyat: $${actualPrice}`);
        }
        
        setLoading(false);
        setTimeout(() => {
          setIsLocked(false);
          setActiveBets({});
        }, 2000);
      }, 3500);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-white p-4 font-sans uppercase max-w-[600px] mx-auto overflow-x-hidden">
      <ToastContainer position="top-center" theme="dark" />
      
      {/* ÜST PANEL */}
      <div className="w-full flex justify-between items-center mb-6 bg-[#111] p-5 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="text-left">
          <p className="text-[8px] text-slate-500 font-bold mb-1">LIVE ETH</p>
          <p className="text-lg font-black text-green-500">${ethPrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className={`text-[8px] font-bold px-3 py-1 rounded-full mb-1 ${timeLeft > 10 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
             {timeLeft}S
          </div>
          <h1 className="text-xl font-black italic text-yellow-500 tracking-tighter">ETHSPIN</h1>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 font-bold mb-1">CHIPS</p>
          <p className="text-lg font-black text-white">{balance.toLocaleString()} ¢</p>
        </div>
      </div>

      {/* WalletConnect Butonu (Mobilde de çalışır) */}
      <div className="mb-6 scale-90">
        <w3m-button />
      </div>

      {/* ÇARK VE TAHTA AYNI KALIYOR... */}
      {/* (Yer tasarrufu için özet geçiyorum, yukarıdaki tahta kodunu buraya ekleyebilirsin) */}
      
      <div className="w-full bg-[#111] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl">
            <>
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">MİKTAR:</span>
                    <div className="flex gap-2">
                        {[10, 50, 100].map(amt => (
                            <button key={amt} onClick={() => setBetAmount(amt)}
                                className={`w-10 h-10 rounded-full border-2 font-black text-[9px] transition-all ${betAmount === amt ? 'bg-yellow-500 text-black border-white' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                                {amt}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                  disabled={loading || isLocked || totalBetAmount === 0 || timeLeft < 10} 
                  onClick={confirmAndPlay} 
                  className={`w-full h-16 rounded-2xl font-black text-sm transition-all ${isLocked ? 'bg-slate-800 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}
                >
                  {isLocked ? "İŞLENİYOR..." : `ONAYLA (${totalBetAmount.toLocaleString()} ¢)`}
                </button>
            </>
      </div>
    </main>
  );
}