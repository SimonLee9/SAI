import About from "./components/About";
import FAQ from "./components/FAQ";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Showcase from "./components/Showcase";
import SoundLab from "./components/SoundLab";
import Waitlist from "./components/Waitlist";

export default function App() {
  return (
    <div className="min-h-full">
      <Header />
      <main>
        <Hero />
        <Features />
        <Showcase />
        <SoundLab />
        <Waitlist />
        <About />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
