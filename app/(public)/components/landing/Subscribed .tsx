"use client"

import { useState } from "react"

const Subscribed  = () => {
    // const [subscribed, setsubscribed] = useState(true);
    const [email, setEmail] = useState("")
  return (
    <div className="flex flex-col gap-6">

    <form 
    // onSubmit={handleSubscribe}
     className="space-y-4">
      <div className="relative">
        <input 
          type="email" 
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ایمیل خود را وارد کنید..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg placeholder:text-white/40 focus:outline-none focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all"
        />
    <div className="bg-[#00bfff]/20 border border-[#00bfff]/50 p-8 rounded-3xl text-center animate-pulse">
      <div className="text-4xl mb-4">🎮</div>
      <h3 className="text-xl font-bold text-[#00bfff]">به جمع کرمان آتاری خوش آمدید!</h3>
      <p className="text-white/60 text-sm mt-2">
        شما حالا عضو حلقه داخلی گیمرهای ما هستید.
      </p>
    </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-[#9d00ff] text-white font-black py-5 rounded-2xl text-xl hover:shadow-[0_0_30px_rgba(157,0,255,0.4)] hover:scale-[1.02] transition-all uppercase tracking-widest"
      >
        عضویت در خبرنامه
      </button>

      <p className="text-[10px] text-white/30 text-center uppercase tracking-tighter">
        با عضویت، شما با قوانین ما و سیاست حفظ حریم خصوصی موافقت می‌کنید.
      </p>
    </form>
</div>

  )
}

export default Subscribed 