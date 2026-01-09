'use client'
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import abi from '../constants/abi.json';
import { contractAddress } from '../constants';

export default function Home() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0); // Sayı olarak tutuyoruz
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeBets, setActiveBets] = useState({});
  const [isLocked, setIsLocked] = useState(false);

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const [betAmount, setBetAmount] = useState(10);

  // 1. Canlı Fiyat Çekme
  const fetchLivePrice = useCallback(async () => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&t=${Date.now()}`);
      const data = await res.json();
      if (data.ethereum) setEthPrice(data.ethereum.usd);
    } catch (err) { console.error("Fiyat hatası:", err); }
  }, []);

  // 2. Bakiyeyi Kontrattan Güncel Çekme
  const fetchBalance = useCallback(async (userAddress) => {
    if (!userAddress) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const b = await contract.userChipBalance(userAddress);
      // Not: Eğer kontratta bakiye çok büyük bir sayıysa (10^18), Number(b) yerine ethers.formatUnits kullanmalısın.
      // Ancak chip birimi tam sayı ise Number(b) yeterlidir.
      setBalance(Number(b)); 
    } catch (err) { 
      console.error("Bakiye hatası:", err); 
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = new Date().getSeconds();
      setTimeLeft(60 - seconds);
      if (seconds === 0) {
        fetchLivePrice();
        setActiveBets({});
        setIsLocked(false);
      }
    }, 1000);
    fetchLivePrice();
    return () => clearInterval(timer);
  }, [fetchLivePrice]);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        fetchBalance(accounts[0]);
        toast.success("Cüzdan bağlandı!");
      } catch (err) { toast.error("Bağlantı reddedildi."); }
    }
  };

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

 // ... (sayfanın üst kısımları aynı kalıyor)

  const confirmAndPlay = async () => {
    if (!account) return connectWallet();
    if (totalBetAmount === 0) return toast.warn("Lütfen aralık seçin!");
    if (balance < totalBetAmount) return toast.error("Yetersiz bakiye!");
    
    setIsLocked(true);
    setLoading(true);

    // 1. Önce bahis tutarını bakiyeden düşüyoruz
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

      // Çarkın durmasını bekle (3.5 saniye)
      setTimeout(async () => {
        const betOnWinner = activeBets[targetIdx] || 0;
        const wonAmount = betOnWinner * 36; // 36 katı kazanç mantığı
        
        if (wonAmount > 0) {
          toast.success(`🎉 TEBRİKLER! ${wonAmount} Chip Kazandınız!`, { 
            position: "top-center",
            autoClose: 5000,
            theme: "colored"
          });
          
          // 2. KAZANCI ANINDA ARAYÜZE EKLE (Kontratı beklemeden)
          setBalance(prev => prev + wonAmount);
          
          // 3. 2 Saniye sonra kontratla senkronize et (Arka planda)
          setTimeout(() => fetchBalance(account), 2000);
        } else {
          toast.error(`📉 Kaybettiniz. Fiyat: $${actualPrice}`, { theme: "dark" });
          // Kayıp durumunda da kontratla senkronize olalım
          setTimeout(() => fetchBalance(account), 1000);
        }
        
        setLoading(false);
        // Tur bittiğinde kilitleri aç ve bahisleri temizle
        setTimeout(() => {
          setIsLocked(false);
          setActiveBets({});
        }, 1000);

      }, 3500);
    }, 1000);
  };
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-white p-4 font-sans uppercase max-w-[600px] mx-auto overflow-x-hidden">
      <ToastContainer position="top-center" theme="dark" />
      
      <div className="w-full flex justify-between items-center mb-6 bg-[#111] p-5 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="text-left">
          <p className="text-[8px] text-slate-500 font-bold mb-1 uppercase tracking-widest">LIVE ETH</p>
          <p className="text-lg font-black text-green-500">${ethPrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className={`text-[8px] font-bold px-3 py-1 rounded-full mb-1 ${timeLeft > 10 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
            {timeLeft > 10 ? `KALAN: ${timeLeft}S` : "KAPALI"}
          </div>
          <h1 className="text-xl font-black italic text-yellow-500 tracking-tighter">ETHSPIN</h1>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 font-bold mb-1 uppercase tracking-widest">CHIPS</p>
          <p className="text-lg font-black text-white">{balance.toLocaleString()} ¢</p>
        </div>
      </div>

      {/* Çark ve Tahta bölümleri aynı kalıyor, sadece balance kullanımı güncellendi */}
      <div className="relative mb-8 scale-90">
        <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-t-yellow-500 z-10 border-l-transparent border-r-transparent"></div>
        <div 
          className="w-32 h-32 rounded-full border-4 border-slate-900 shadow-2xl relative overflow-hidden transition-all duration-[3.5s]"
          style={{ 
            transform: `rotate(${rotation}deg)`, 
            transitionTimingFunction: 'cubic-bezier(0.1, 0, 0.1, 1)',
            background: 'conic-gradient(#111 0deg 18deg, #ef4444 18deg 36deg, #111 36deg 54deg, #ef4444 54deg 72deg, #111 72deg 90deg, #ef4444 90deg 108deg, #111 108deg 126deg, #ef4444 126deg 144deg, #111 144deg 162deg, #ef4444 162deg 180deg, #111 180deg 198deg, #ef4444 198deg 216deg, #111 216deg 234deg, #ef4444 234deg 252deg, #111 252deg 270deg, #ef4444 270deg 288deg, #111 288deg 306deg, #ef4444 306deg 324deg, #111 324deg 342deg, #ef4444 342deg 360deg)'
          }}
        ></div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-[#111] p-3 rounded-[2rem] border border-white/5 mb-6 w-full shadow-inner overflow-y-auto max-h-[300px]">
        {Array.from({length: 37}, (_, i) => i).map(num => {
          const range = getRangeData(num);
          const betOnThis = activeBets[num];
          return (
            <button key={num} onClick={() => handleBoxClick(num)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all 
                ${betOnThis ? 'bg-yellow-500 border-white scale-105 z-10' : 
                  num === 18 ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800/40 border-slate-700'}`}>
              {betOnThis && <div className="absolute -top-2 -right-1 bg-white text-black text-[7px] px-1.5 py-0.5 rounded-full font-black">{betOnThis}¢</div>}
              <span className={`text-[9px] font-black tracking-tighter ${betOnThis ? 'text-black' : 'text-slate-300'}`}>
                ${range.start}-{range.end}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-full bg-[#111] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl">
        {!account ? (
            <button onClick={connectWallet} className="w-full bg-yellow-500 text-black h-14 rounded-2xl font-black text-xs">CÜZDANI BAĞLA</button>
        ) : (
            <>
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">BAHİS MİKTARI:</span>
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
                  className={`w-full h-16 rounded-2xl font-black text-sm transition-all ${isLocked ? 'bg-slate-800 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                >
                  {isLocked ? "İŞLENİYOR..." : `ONAYLA (${totalBetAmount.toLocaleString()} ¢)`}
                </button>
            </>
        )}
      </div>
    </main>
  );
}
