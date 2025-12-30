'use client'
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import abi from '../constants/abi.json';
import { contractAddress } from '../constants';

export default function Home() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [ethPrice, setEthPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await res.json();
        setEthPrice(data.ethereum.usd);
      } catch (err) { console.error("Fiyat hatası:", err); }
    };

    const timer = setInterval(() => {
      const seconds = new Date().getSeconds();
      setTimeLeft(60 - seconds);
      if (seconds === 0) fetchLivePrice();
    }, 1000);

    fetchLivePrice();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchBalance(accounts[0]);
        }
      });
    }
  }, []);

  const fetchBalance = async (userAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const b = await contract.userChipBalance(userAddress);
      setBalance(b.toString());
    } catch (err) {}
  };

  const getRangeData = (num) => {
    const step = 10; 
    const diff = (num - 18) * step;
    const start = Math.floor(ethPrice + diff);
    const end = start + 9;
    return { start, end };
  };

  const playBet = async (type) => {
    if (timeLeft < 10) return toast.warn("⌛ Bahisler kapandı! Yeni turu bekleyin.");
    if (Number(balance) < betAmount) return toast.error("❌ Yetersiz Bakiye!");
    if (type === 'number' && selectedNumber === null) return toast.warn("⚠️ Tahmin için kutucuk seçin!");

    setLoading(true);
    toast.info(`${betAmount} Chip bahis alındı. Sonuç bekleniyor...`);

    setTimeout(async () => {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await res.json();
      const actualPrice = data.ethereum.usd;

      const diff = actualPrice - ethPrice;
      const targetIdx = Math.max(0, Math.min(36, Math.floor((diff / 10) + 18)));
      
      const segment = 360 / 37;
      const targetDegree = targetIdx * segment;
      const newRotation = rotation + 1800 + (targetDegree - (rotation % 360));
      setRotation(newRotation);

      setTimeout(() => {
        setHistory(prev => [actualPrice.toFixed(2), ...prev].slice(0, 5));
        let won = false;
        if (type === 'number' && targetIdx === selectedNumber) won = true;
        else if (type === 'red' && redNumbers.includes(targetIdx)) won = true;
        else if (type === 'black' && !redNumbers.includes(targetIdx) && targetIdx !== 0) won = true;

        if (won) {
          const mult = type === 'number' ? 36 : 2;
          setBalance(prev => (Number(prev) + (betAmount * mult)).toString());
          toast.success(`🎉 BİLDİNİZ! Gerçek Fiyat: $${actualPrice}`);
        } else {
          toast.error(`📉 KAYIP! Gerçek Fiyat: $${actualPrice}`);
        }
        setLoading(false);
      }, 3500);
    }, 1000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-white p-4 font-sans uppercase">
      <ToastContainer position="top-center" theme="dark" />
      
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 bg-[#111] p-6 rounded-[2rem] border border-white/5">
        <div>
          <p className="text-[10px] text-slate-500 font-bold mb-1">CANLI ETH/USD</p>
          <p className="text-xl font-black text-green-500">${ethPrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className={`text-[10px] font-bold px-3 py-1 rounded-full mb-2 ${timeLeft > 10 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
            {timeLeft > 10 ? `KALAN SÜRE: ${timeLeft}S` : "BAHİSLER KAPALI"}
          </div>
          <h1 className="text-3xl font-black italic text-yellow-500">ETHSPIN</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-bold mb-1">CHIPS</p>
          <p className="text-xl font-black">{Number(balance).toLocaleString()} ¢</p>
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-t-yellow-500 z-10 border-l-transparent border-r-transparent"></div>
        <div 
          className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-2xl relative overflow-hidden transition-all duration-[3.5s]"
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            transitionTimingFunction: 'cubic-bezier(0.1, 0, 0.1, 1)',
            background: 'conic-gradient(#111 0deg 18deg, #ef4444 18deg 36deg, #111 36deg 54deg, #ef4444 54deg 72deg, #111 72deg 90deg, #ef4444 90deg 108deg, #111 108deg 126deg, #ef4444 126deg 144deg, #111 144deg 162deg, #ef4444 162deg 180deg, #111 180deg 198deg, #ef4444 198deg 216deg, #111 216deg 234deg, #ef4444 234deg 252deg, #111 252deg 270deg, #ef4444 270deg 288deg, #111 288deg 306deg, #ef4444 306deg 324deg, #111 324deg 342deg, #ef4444 342deg 360deg)'
          }}
        ></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 bg-[#111] p-4 rounded-[2.5rem] border border-white/5 mb-8 w-full max-w-6xl overflow-x-auto">
        {Array.from({length: 37}, (_, i) => i).map(num => {
          const range = getRangeData(num);
          return (
            <button 
              key={num} 
              onClick={() => setSelectedNumber(num)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300
                ${num === 18 ? 'bg-yellow-500/10 border-yellow-500 shadow-md' : redNumbers.includes(num) ? 'bg-red-600/10 border-red-500/20' : 'bg-slate-800/40 border-slate-700'}
                ${selectedNumber === num ? 'ring-2 ring-yellow-500 bg-yellow-500/30 scale-105 z-10' : 'hover:border-white/20'}`}
            >
              <span className="text-[10px] font-black tracking-tighter">${range.start}-{range.end}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-md bg-[#111] border border-white/5 p-8 rounded-[3rem] shadow-2xl">
        <div className="flex justify-center gap-3 mb-8">
          {[10, 50, 100, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => setBetAmount(amt)}
              className={`w-12 h-12 rounded-full border-2 font-black text-xs transition-all
                ${betAmount === amt ? 'bg-yellow-500 text-black border-white shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
            >
              {amt}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <button disabled={loading || timeLeft < 10} onClick={() => playBet('red')} className="bg-red-600 h-16 rounded-2xl font-black text-xs hover:brightness-110 active:scale-95 disabled:opacity-20 transition-all uppercase">KIRMIZI</button>
          <button disabled={loading || timeLeft < 10} onClick={() => playBet('number')} className="bg-white text-black h-16 rounded-2xl font-black text-xs hover:bg-slate-200 active:scale-95 disabled:opacity-20 transition-all uppercase">ARALIK</button>
          <button disabled={loading || timeLeft < 10} onClick={() => playBet('black')} className="bg-slate-900 h-16 border border-slate-800 rounded-2xl font-black text-xs hover:bg-black active:scale-95 disabled:opacity-20 transition-all uppercase">SİYAH</button>
        </div>
      </div>
    </main>
  );
}