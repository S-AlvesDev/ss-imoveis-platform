import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfUseModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-[#1d2d3d] text-white shrink-0">
          <div className="flex items-center space-x-2">
            <img src="/banner.png" alt="Imobiliária São Severino" className="w-[84px] h-[77px] object-contain rounded" referrerPolicy="no-referrer" />
            <div>
              <h2 className="text-lg font-bold tracking-tight">Termos de Uso do Sistema</h2>
              <span className="text-[10px] uppercase font-bold text-slate-300">Normas, Responsabilidades e Regras Contratuais</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer text-slate-200 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-300">
          <div className="border-b pb-4 border-slate-100">
            <p className="text-xs text-gray-400 mb-1">Última atualização: 24 de maio de 2026</p>
            <p className="text-gray-600 font-medium">
              Bem-vindo ao sistema de gestão e controle da <strong>Imobiliária São Severino</strong>. Ao se registrar, acessar ou interagir com nosso sistema, você declara que compreende e aceita expressamente estes Termos de Uso em sua totalidade.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">1. Cadastro de Usuário e Autenticação</h3>
            <p className="text-gray-650">
              Para acessar o sistema de gestão da Imobiliária São Severino ou formular propostas, o usuário deve criar uma conta enviando dados verídicos e precisos (Nome, E-mail, Telefone e Senha). 
            </p>
            <ul className="space-y-1.5 pl-4 list-disc text-gray-650">
              <li>Cada cadastro é pessoal, protegido por senha, e intransferível de acordo com nossa rede imobiliária.</li>
              <li>A Imobiliária São Severino pode, a qualquer momento e sob suspeita de fraude ou má-fé, bloquear ou apagar contas irregulares sem aviso prévio.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">2. Responsabilidades do Usuário</h3>
            <p className="text-gray-650">Os usuários cadastrados se comprometem a:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-gray-650">
              <li>Utilizar a plataforma em total observância às leis brasileiras vigentes, à decência digital e à segurança cibernética.</li>
              <li>Não explorar vulnerabilidades, burlar autenticações, injetar scripts maliciosos ou simular transações financeiras fraudulentas.</li>
              <li>Manter canais ativos para contatos operacionais e envio de aditivos ou notificações de controle de processos de lotes e imóveis.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">3. Relação Pré-Contratual e Propostas</h3>
            <p className="text-gray-650">
              O preenchimento do formulário de interesse em imóveis ou propostas neste painel não assegura a reserva legal do lote ou moradia, servindo estritamente como registro preliminar para análise comercial. A prioridade de aquisição ou locação ocorrerá conforme a ordem física/digital de assinatura e o adiantamento de garantias legais descritas em contrato.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">4. Propriedade Intelectual e Proteção de Marcas</h3>
            <p className="text-gray-650">
              Todas as marcas registradas, layouts corporativos, códigos de programação, bases de dados de produtos imobiliários e arquivos de mídia hospedados são propriedade intelectual exclusiva da <strong>Imobiliária São Severino</strong>, protegidos pela Lei de Direitos Autorais (Lei nº 9.610/1998) e de Propriedade Industrial (Lei nº 9.279/1996).
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">5. Resolução de Conflitos e Foro</h3>
            <p className="text-gray-650">
              Qualquer desentendimento legal relacionado ao uso do painel eletrônico será solucionado amigavelmente através do nosso canal de relacionamento. Caso contrário, fica eleito o Foro da Comarca da Imobiliária São Severino para dirimir eventuais controvérsias judiciais, em conformidade com as leis do Brasil.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-end shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
}
