import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="relative h-auto md:min-h-[60vh] flex flex-col px-8 pt-8 pb-0 md:py-0 md:px-14 sxl:px-24 overflow-hidden bg-[#990000] z-0">
      <div className="absolute inset-0">
        <img 
          alt="Footer background image" 
          decoding="async" 
          data-nimg="fill" 
          className="object-cover w-full h-full" 
          style={{position:'absolute',height:'100%',width:'100%',left:0,top:0,right:0,bottom:0,color:'transparent'}} 
          src="/bg.png" 
        />
      </div>
      


      <div className="w-full border-b border-white/50 flex justify-between">
        <div className="hidden md:block md:w-[38%] flex flex-center items-end relative">
          <div className="relative md:w-[28vw] xl:w-[32vw] aspect-[0.85/1] pointer-events-none mt-auto">
            <img 
              alt="Thalaivar Vijay" 
              decoding="async" 
              data-nimg="fill" 
              className="object-contain object-bottom" 
              style={{position:'absolute',height:'100%',width:'100%',left:0,top:0,right:0,bottom:0,color:'transparent'}} 
              sizes="(min-width:768px) 30vw" 
              src="/mla.png" 
            />
          </div>
        </div>

        <div className="w-full md:pt-[8%] pb-8 md:pb-4 md:w-[55%] flex flex-col justify-between z-10">
          <div>
            <h2 className="text-white text-3xl font-bold mb-2 md:mb-4">Join the movement</h2>
            <p className="text-white/90 text-sm md:text-base leading-relaxed mb-2 md:mb-4">
              Driven by the core vision that everyone deserves everything, Tamilaga Vetri Kazhagam works to advance people-centric politics - for the people, with the people, as one among the people. Be a part of this movement - join the party today and make your contribution count.
            </p>
            <div className="w-full flex justify-end md:mt-2 mb-6">
              <a href="https://tvk.family/" target="_blank" rel="noopener noreferrer" className="w-fit flex justify-between items-center bg-[#FFD700] rounded-lg p-2 xl:p-4 flex-shrink-0 text-black font-semibold hover:bg-[#FFD700]/90 transition-colors">
                <p className="mr-2">Join TVK</p>
                <button className="hover:cursor-pointer">
                  <div className="w-6 h-6 md:w-6 md:h-6 xl:w-9 xl:h-9 rounded-md flex items-center justify-center bg-[#FFD700] relative overflow-hidden border border-black/10">
                    <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(45deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.20) 45%, rgba(255, 255, 255, 1) 100%)'}}></div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 md:w-3 md:h-3 xl:w-5 xl:h-5 relative z-10" aria-hidden="true"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>
                  </div>
                </button>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-0 md:flex-row justify-between z-10">
            <div>
              <p className="text-[#FFD700] mb-3 xl:mb-4"></p>
              <div className="rounded-lg w-fit md:rounded-lg border-white/50 border flex items-center justify-between backdrop-blur-lg overflow-hidden">
                <a href="https://x.com/TVKVijayHQ" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on twitter">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 512 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path></svg>
                  </div>
                </a>
                <a href="https://www.instagram.com/tvkvijayhq/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on instagram">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 448 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path></svg>
                  </div>
                </a>
                <a href="https://www.facebook.com/TVKVijayHQ/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on facebook">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 1024 1024" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-32 736H663.9V602.2h104l15.6-120.7H663.9v-77.1c0-35 9.7-58.8 59.8-58.8h63.9v-108c-11.1-1.5-49-4.8-93.2-4.8-92.2 0-155.3 56.3-155.3 159.6v89H434.9v120.7h104.3V848H176V176h672v672z"></path></svg>
                  </div>
                </a>
                <a href="https://www.youtube.com/@TVKVijayHQ-Offl" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on youtube">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 1024 1024" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M960 509.2c0-2.2 0-4.7-.1-7.6-.1-8.1-.3-17.2-.5-26.9-.8-27.9-2.2-55.7-4.4-81.9-3-36.1-7.4-66.2-13.4-88.8a139.52 139.52 0 0 0-98.3-98.5c-28.3-7.6-83.7-12.3-161.7-15.2-37.1-1.4-76.8-2.3-116.5-2.8-13.9-.2-26.8-.3-38.4-.4h-29.4c-11.6.1-24.5.2-38.4.4-39.7.5-79.4 1.4-116.5 2.8-78 3-133.5 7.7-161.7 15.2A139.35 139.35 0 0 0 82.4 304C76.3 326.6 72 356.7 69 392.8c-2.2 26.2-3.6 54-4.4 81.9-.3 9.7-.4 18.8-.5 26.9 0 2.9-.1 5.4-.1 7.6v5.6c0 2.2 0 4.7.1 7.6.1 8.1.3 17.2.5 26.9.8 27.9 2.2 55.7 4.4 81.9 3 36.1 7.4 66.2 13.4 88.8 12.8 47.9 50.4 85.7 98.3 98.5 28.2 7.6 83.7 12.3 161.7 15.2 37.1 1.4 76.8 2.3 116.5 2.8 13.9.2 26.8.3 38.4.4h29.4c11.6-.1 24.5-.2 38.4-.4 39.7-.5 79.4-1.4 116.5-2.8 78-3 133.5-7.7 161.7-15.2 47.9-12.8 85.5-50.5 98.3-98.5 6.1-22.6 10.4-52.7 13.4-88.8 2.2-26.2 3.6-54 4.4-81.9.3-9.7.4-18.8.5-26.9 0-2.9.1-5.4.1-7.6v-5.6zm-72 5.2c0 2.1 0 4.4-.1 7.1-.1 7.8-.3 16.4-.5 25.7-.7 26.6-2.1 53.2-4.2 77.9-2.7 32.2-6.5 58.6-11.2 76.3-6.2 23.1-24.4 41.4-47.4 47.5-21 5.6-73.9 10.1-145.8 12.8-36.4 1.4-75.6 2.3-114.7 2.8-13.7.2-26.4.3-37.8.3h-28.6l-37.8-.3c-39.1-.5-78.2-1.4-114.7-2.8-71.9-2.8-124.9-7.2-145.8-12.8-23-6.2-41.2-24.4-47.4-47.5-4.7-17.7-8.5-44.1-11.2-76.3-2.1-24.7-3.4-51.3-4.2-77.9-.3-9.3-.4-18-.5-25.7 0-2.7-.1-5.1-.1-7.1v-4.8c0-2.1 0-4.4.1-7.1.1-7.8.3-16.4.5-25.7.7-26.6 2.1-53.2 4.2-77.9 2.7-32.2 6.5-58.6 11.2-76.3 6.2-23.1 24.4-41.4 47.4-47.5 21-5.6 73.9-10.1 145.8-12.8 36.4-1.4 75.6-2.3 114.7-2.8 13.7-.2 26.4-.3 37.8-.3h28.6l37.8.3c39.1.5 78.2 1.4 114.7 2.8 71.9 2.8 124.9 7.2 145.8 12.8 23 6.2 41.2 24.4 47.4 47.5 4.7 17.7 8.5 44.1 11.2 76.3 2.1 24.7 3.4 51.3 4.2 77.9.3 9.3.4 18 .5 25.7 0 2.7.1 5.1.1 7.1v4.8zM423 646l232-135-232-133z"></path></svg>
                  </div>
                </a>
                <a href="https://www.threads.com/@tvkvijayhq" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on threads">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 448 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M331.5 235.7c2.2 .9 4.2 1.9 6.3 2.8c29.2 14.1 50.6 35.2 61.8 61.4c15.7 36.5 17.2 95.8-30.3 143.2c-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2c-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2C102.2 40.1 156.2 16.5 226.4 16h.3c70.3 .5 124.9 24 162.3 69.9c18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4c-29.2-35.8-73-54.2-130.5-54.6c-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3c28 35.6 71.2 53.9 128.2 54.4c51.4-.4 85.4-12.6 113.7-40.9c32.3-32.2 31.7-71.8 21.4-95.9c-6.1-14.2-17.1-26-31.9-34.9c-3.7 26.9-11.8 48.3-24.7 64.8c-17.1 21.8-41.4 33.6-72.7 35.3c-23.6 1.3-46.3-4.4-63.9-16c-20.8-13.8-33-34.8-34.3-59.3c-2.5-48.3 35.7-83 95.2-86.4c21.1-1.2 40.9-.3 59.2 2.8c-2.4-14.8-7.3-26.6-14.6-35.2c-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6 .4 99.9 39.5 103.7 107.7l-.2 .2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3c25.6-1.4 54.6-11.4 59.5-73.2c-13.2-2.9-27.8-4.4-43.4-4.4c-4.8 0-9.6 .1-14.4 .4c-42.9 2.4-57.2 23.2-56.2 41.8l-.1 .1z"></path></svg>
                  </div>
                </a>
              </div>
            </div>
            <div>
              <p className="text-[#FFD700] mb-3 xl:mb-4"></p>
              <div className="rounded-lg w-fit md:rounded-lg border-white/50 border flex items-center justify-between backdrop-blur-lg overflow-hidden">
                <a href="https://x.com/TVKPartyHQ" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on twitter">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 512 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path></svg>
                  </div>
                </a>
                <a href="https://www.instagram.com/tvkpartyhq/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on instagram">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 448 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path></svg>
                  </div>
                </a>
                <a href="https://www.facebook.com/tvkpartyhq/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on facebook">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 1024 1024" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-32 736H663.9V602.2h104l15.6-120.7H663.9v-77.1c0-35 9.7-58.8 59.8-58.8h63.9v-108c-11.1-1.5-49-4.8-93.2-4.8-92.2 0-155.3 56.3-155.3 159.6v89H434.9v120.7h104.3V848H176V176h672v672z"></path></svg>
                  </div>
                </a>
                <a href="https://www.threads.com/@tvkpartyhq" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#FFD700] hover:bg-white/10 transition-colors duration-200 px-4 py-2 xl:px-5 xl:py-3 border-r border-white/50 last:border-r-0" aria-label="Follow us on threads">
                  <div className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="15" viewBox="0 0 448 512" className="w-full h-full" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M331.5 235.7c2.2 .9 4.2 1.9 6.3 2.8c29.2 14.1 50.6 35.2 61.8 61.4c15.7 36.5 17.2 95.8-30.3 143.2c-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2c-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2C102.2 40.1 156.2 16.5 226.4 16h.3c70.3 .5 124.9 24 162.3 69.9c18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4c-29.2-35.8-73-54.2-130.5-54.6c-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3c28 35.6 71.2 53.9 128.2 54.4c51.4-.4 85.4-12.6 113.7-40.9c32.3-32.2 31.7-71.8 21.4-95.9c-6.1-14.2-17.1-26-31.9-34.9c-3.7 26.9-11.8 48.3-24.7 64.8c-17.1 21.8-41.4 33.6-72.7 35.3c-23.6 1.3-46.3-4.4-63.9-16c-20.8-13.8-33-34.8-34.3-59.3c-2.5-48.3 35.7-83 95.2-86.4c21.1-1.2 40.9-.3 59.2 2.8c-2.4-14.8-7.3-26.6-14.6-35.2c-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6 .4 99.9 39.5 103.7 107.7l-.2 .2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3c25.6-1.4 54.6-11.4 59.5-73.2c-13.2-2.9-27.8-4.4-43.4-4.4c-4.8 0-9.6 .1-14.4 .4c-42.9 2.4-57.2 23.2-56.2 41.8l-.1 .1z"></path></svg>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col h-full justify-between py-4 xl:py-8 z-10 w-full">
        <div className="w-full flex flex-col md:flex-row justify-between">
          <h2 className="text-[#FFD700] text-xl md:text-3xl font-bold mt-4 md:mt-0 mb-6 md:mb-0 md:whitespace-nowrap z-10 relative px-4">
            Tamilaga Vettri Kazhagam
          </h2>
          
          <div className="hidden md:flex gap-4 md:gap-8 lg:gap-12 xl:gap-16 2xl:gap-20 md:mt-4">
            <div className="flex flex-col gap-3 xl:gap-6">
              <p className="text-[#FFD700] font-semibold text-sm xl:text-base">2026 - Election</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/election-candidates/tamilnadu">Candidates for Victory</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/manifesto">Election Guarantees</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/disclosures/TN2026C7form">Disclosures</a>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:gap-6">
              <p className="text-[#FFD700] font-semibold text-sm xl:text-base">Party</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/about-party">About Party</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/ideology">Ideology</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/action-plan">Action Plan</a>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:gap-6">
              <p className="text-[#FFD700] font-semibold text-sm xl:text-base">Organisation</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/leadership">Leadership</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/district-leadership">District Organisation Structure</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/wings">Wings</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/committees">Committees</a>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:gap-6">
              <p className="text-[#FFD700] font-semibold text-sm xl:text-base">Updates</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/resolutions">Resolutions</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/announcements">Announcements</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/events">Events</a>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:gap-6">
              <p className="text-[#FFD700] font-semibold text-sm xl:text-base">More</p>
              <div className="flex flex-col gap-2 md:gap-3">
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/gallery">Gallery</a>
                <a className="font-bold text-white/90 hover:text-white text-xs xl:text-sm transition-colors" href="/en/contact-us">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-6 md:hidden px-4">
            <div>
              <p className="text-[#FFD700] font-semibold mb-2">2026 - Election</p>
              <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/election-candidates/tamilnadu">Candidates for Victory</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/manifesto">Election Guarantees</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/disclosures/TN2026C7form">Disclosures</a>
              </div>
            </div>
            <div>
              <p className="text-[#FFD700] font-semibold mb-2">Party</p>
              <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/about-party">About Party</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/ideology">Ideology</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/action-plan">Action Plan</a>
              </div>
            </div>
            <div>
              <p className="text-[#FFD700] font-semibold mb-2">Organisation</p>
              <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/leadership">Leadership</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/district-leadership">District Organisation Structure</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/wings">Wings</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/committees">Committees</a>
              </div>
            </div>
            <div>
              <p className="text-[#FFD700] font-semibold mb-2">Updates</p>
              <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/resolutions">Resolutions</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/announcements">Announcements</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/events">Events</a>
              </div>
            </div>
            <div>
              <p className="text-[#FFD700] font-semibold mb-2">More</p>
              <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/gallery">Gallery</a>
                <a className="font-bold text-white/90 hover:text-white text-xs" href="/en/contact-us">Contact</a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/30 w-full flex flex-col items-center justify-center mt-8 md:mt-12 pt-4 pb-2 text-xs text-white/80 px-4 md:px-0">
          <span className="mt-4 md:mt-0 text-center"> © 2026 Tamilaga Vettri Kazhagam. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
