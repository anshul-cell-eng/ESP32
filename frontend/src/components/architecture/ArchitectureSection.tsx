import React from 'react';
import { 
  Cpu, 
  Flame, 
  Power, 
  Volume2, 
  Radio, 
  ArrowRight, 
  Server, 
  ShieldCheck, 
  Workflow, 
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const hardwarePipeline = [
    {
      step: '01',
      title: 'Sensor Layer',
      device: 'MQ-2 Gas Sensor',
      pin: 'GPIO 34 (ADC1_CH6)',
      desc: 'SnO2 metal-oxide semiconductor changes electrical conductivity when LPG/isobutane/propane molecules adsorb onto the heated surface.',
      icon: Flame,
      color: 'text-[#35D7E8]',
      badge: '12-bit Analog'
    },
    {
      step: '02',
      title: 'Edge Processing',
      device: 'ESP32 Dual-Core MCU',
      pin: '240 MHz Xtensa LX6',
      desc: 'Autonomous FreeRTOS loop samples ADC at 100ms intervals, performs rolling window averaging, and evaluates hysteresis threshold limits.',
      icon: Cpu,
      color: 'text-[#F7FAFC]',
      badge: '<100ms Safety Loop'
    },
    {
      step: '03',
      title: 'Autonomous Cutoff',
      device: '5V Optocoupled Relay',
      pin: 'GPIO 13 (Digital OUT)',
      desc: 'Energizes solenoid valve driver circuit instantly upon threshold breach, cutting gas supply without requiring web connectivity.',
      icon: Power,
      color: 'text-[#FF746D]',
      badge: 'Fail-Safe Isolation'
    },
    {
      step: '04',
      title: 'Telemetry Sync',
      device: 'FastAPI + SSE Stream',
      pin: '802.11 b/g/n Wi-Fi',
      desc: 'Pushes synchronized sensor metrics and actuator state packets via Server-Sent Events to the live web dashboard in under 40ms.',
      icon: Radio,
      color: 'text-[#22C55E]',
      badge: 'Real-time Telemetry'
    }
  ];

  const pinoutSpecs = [
    { component: 'MQ-2 Gas Sensor (AOUT)', pin: 'GPIO 34', type: 'ADC Input', function: 'Gas Concentration (0-4095)' },
    { component: 'Relay Module (IN)', pin: 'GPIO 13', type: 'Digital Output', function: 'Solenoid Cutoff Control' },
    { component: 'Piezo Buzzer (Active)', pin: 'GPIO 14', type: 'Digital Output', function: 'Audible Emergency Siren' },
    { component: 'RGB LED - Red Anode', pin: 'GPIO 25', type: 'PWM / Digital', function: 'Critical Alarm Beacon' },
    { component: 'RGB LED - Green Anode', pin: 'GPIO 26', type: 'PWM / Digital', function: 'Normal Safe Beacon' },
    { component: 'RGB LED - Blue Anode', pin: 'GPIO 27', type: 'PWM / Digital', function: 'Diagnostic / Wi-Fi Sync' },
    { component: 'OLED Display (Optional)', pin: 'GPIO 21 (SDA), 22 (SCL)', type: 'I2C Bus', function: 'Local Diagnostic Matrix' }
  ];

  return (
    <section id="architecture" className="w-full py-16 px-4 sm:px-6 lg:px-12 border-t border-[#C0D1D4]/10 bg-[#052226]/50">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B2C33] border border-[#35D7E8]/20 text-[11px] font-mono uppercase tracking-widest text-[#35D7E8]">
              <Workflow className="w-3.5 h-3.5" />
              <span>Engineering Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F7FAFC] tracking-tight">
              Hardware-First Safety Pipeline
            </h2>
            <p className="text-sm sm:text-base text-[#C0D1D4] max-w-2xl">
              Unlike cloud-dependent IoT systems that fail during network outages, SENTINEL executes complete gas isolation locally at the hardware level in under 100 milliseconds.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#7E9A9E] bg-[#06282E]/80 px-4 py-2 rounded-xl border border-[#C0D1D4]/10">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <span>Autonomous Edge Verification Loop</span>
          </div>
        </div>

        {/* 4-Step Hardware Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {hardwarePipeline.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.step}
                className="p-5 rounded-2xl bg-[#0B2C33]/70 border border-[#C0D1D4]/10 hover:border-[#35D7E8]/30 backdrop-blur-md flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black font-mono text-[#35D7E8]/40 group-hover:text-[#35D7E8] transition-colors">
                      {step.step}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#06282E] border border-[#C0D1D4]/10 text-[#C0D1D4]">
                      {step.badge}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-[#06282E] border border-[#C0D1D4]/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>

                  <h3 className="text-base font-bold text-white mb-0.5">{step.title}</h3>
                  <div className="text-xs font-mono text-[#35D7E8] mb-2">{step.device}</div>
                  <p className="text-xs text-[#C0D1D4] leading-relaxed mb-4">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#C0D1D4]/10 text-[11px] font-mono text-[#7E9A9E]">
                  Interface: <span className="text-[#F7FAFC]">{step.pin}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical Pinout & Hardware Specification Table */}
        <div className="p-6 rounded-2xl bg-[#0B2C33]/60 border border-[#C0D1D4]/10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#C0D1D4]/10">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#35D7E8]" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Hardware Pinout &amp; Microcontroller Wiring Map
              </h3>
            </div>
            <span className="text-xs font-mono text-[#7E9A9E]">ESP32 WROOM-32 / NodeMCU-32S</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#C0D1D4]/10 text-[#7E9A9E]">
                  <th className="pb-2.5 font-semibold">Subsystem / Component</th>
                  <th className="pb-2.5 font-semibold">ESP32 Pin</th>
                  <th className="pb-2.5 font-semibold">Signal Direction</th>
                  <th className="pb-2.5 font-semibold">Operational Function</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C0D1D4]/5 text-[#C0D1D4]">
                {pinoutSpecs.map((spec, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 font-medium text-white">{spec.component}</td>
                    <td className="py-2.5 text-[#35D7E8] font-bold">{spec.pin}</td>
                    <td className="py-2.5 text-[#7E9A9E]">{spec.type}</td>
                    <td className="py-2.5">{spec.function}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
