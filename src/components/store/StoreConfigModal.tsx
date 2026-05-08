import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Smartphone, ShoppingCart, ChevronRight, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreConfigModalProps {
  onClose: () => void;
  onModeSelected: (mode: "ifood" | "whatsapp") => void;
  currentMode: string;
}

const StoreConfigModal = ({ onClose, onModeSelected, currentMode }: StoreConfigModalProps) => {
  const [selectedMode, setSelectedMode] = useState<"ifood" | "whatsapp">(currentMode as any || "whatsapp");

  const modes = [
    {
      id: "ifood" as const,
      title: "Similar ao iFood",
      icon: ShoppingCart,
      description: "O cliente preenche nome, endereço, escolhe entre entrega ou retirada, e acompanha o status do pedido (Pendente, Preparando, Saiu para entrega, Entregue). Você gerencia tudo pelo painel admin.",
      features: ["Formulário completo de checkout", "Escolha entrega ou retirada", "Acompanhamento de status em tempo real", "PIX manual com chave configurável", "Gestão completa no painel admin"],
    },
    {
      id: "whatsapp" as const,
      title: "Pedido via WhatsApp",
      icon: Smartphone,
      description: "O cliente preenche os dados e ao confirmar, é redirecionado para o WhatsApp com uma mensagem formatada contendo todos os detalhes do pedido. Simples e direto.",
      features: ["Formulário de dados do cliente", "Mensagem automática formatada", "Redirecionamento direto ao WhatsApp", "Sem necessidade de gestão de pedidos"],
    },
  ];

  const handleConfirm = () => {
    onModeSelected(selectedMode);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card-strong w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: "hsl(var(--store-accent-light))" }} />
            <h2 className="text-base font-bold text-foreground">Modo de Pedido</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <p className="text-xs text-muted-foreground">Escolha como seus clientes farão pedidos na loja:</p>

        <div className="space-y-3">
          {modes.map((mode) => (
            <button key={mode.id} onClick={() => setSelectedMode(mode.id)}
              className="w-full text-left p-4 rounded-xl transition-all"
              style={{
                background: selectedMode === mode.id ? "hsl(var(--store-accent-soft))" : "hsl(0 0% 100% / 0.03)",
                border: `1.5px solid ${selectedMode === mode.id ? "hsl(var(--store-accent-border))" : "hsl(0 0% 100% / 0.08)"}`,
              }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: selectedMode === mode.id ? "hsl(var(--store-accent-soft))" : "hsl(0 0% 100% / 0.05)" }}>
                  <mode.icon className="w-5 h-5" style={{ color: selectedMode === mode.id ? "hsl(var(--store-accent-light))" : "hsl(0 0% 50%)" }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{mode.title}</h3>
                </div>
                {selectedMode === mode.id && (
                  <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--store-accent))" }}>
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{mode.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {mode.features.map((f) => (
                  <span key={f} className="text-[9px] px-2 py-0.5 rounded-full"
                    style={{ background: "hsl(0 0% 100% / 0.05)", color: "hsl(0 0% 60%)" }}>
                    {f}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <button onClick={handleConfirm}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "hsl(var(--store-accent))", color: "white" }}>
          Confirmar Modo
        </button>
      </motion.div>
    </motion.div>
  );
};

export default StoreConfigModal;
