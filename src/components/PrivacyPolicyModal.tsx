import React from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyModalProps) {
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
              <h2 className="text-lg font-bold tracking-tight">Política de Privacidade</h2>
              <span className="text-[10px] uppercase font-bold text-slate-300">Conformidade com a LGPD (Lei nº 13.709/2018)</span>
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
              A <strong>Imobiliária São Severino</strong> valoriza a segurança e a confidencialidade dos seus dados. Esta Política de Privacidade descreve como coletamos, armazenamos, tratamos e protegemos seus dados pessoais de acordo com a <strong>Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018</strong>.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">1. Agente de Tratamento e Controlador</h3>
            <p className="text-gray-650">
              A Imobiliária São Severino atua como <strong>Controladora</strong> no tratamento de dados obtidos por meio de cadastros na plataforma de gestão imobiliária. Isso significa que somos responsáveis por determinar as finalidades e os meios de tratamento dos seus dados essenciais para o andamento dos processos imobiliários e contratuais.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">2. Quais Dados Coletamos e para quais Finalidades?</h3>
            <p className="text-gray-650">Coletamos as informações necessárias para prestar nossos serviços imobiliários de forma segura e eficaz, incluindo:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-gray-650">
              <li><strong>Nome Completo:</strong> Para qualificação das partes em fichas cadastrais, processos de venda, locação ou propostas de compra.</li>
              <li><strong>E-mail e Telefone:</strong> Para contatos operacionais, envio de notificações obrigatórias, atualizações de processos e validação de segurança via código.</li>
              <li><strong>Dados de Navegação / IP:</strong> Para rastrear logins, registrar logs de segurança e auditar alterações contratuais feitas no painel.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">3. Base Legal para o Tratamento de Dados</h3>
            <p className="text-gray-650">Realizamos o tratamento dos seus dados sob as seguintes bases legais previstas no Artigo 7º da LGPD:</p>
            <ul className="space-y-1.5 pl-4 list-disc text-gray-650">
              <li><strong>Consentimento:</strong> Fornecido livremente no momento em que você cria sua conta de acesso e concorda com esta política.</li>
              <li><strong>Execução de Contrato:</strong> Para as etapas pré-contratuais e execução de contratos de compra, venda ou locação imobiliária.</li>
              <li><strong>Legítimo Interesse:</strong> Visando a segurança de nossa plataforma, prevenção a fraudes e auditoria de auditorias internas.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">4. Compartilhamento e Transferência de Dados</h3>
            <p className="text-gray-650">
              A Imobiliária São Severino <strong>não vende nem comercializa</strong> de nenhuma forma seus dados pessoais. Seus dados poderão ser compartilhados apenas com parceiros estritamente necessários para viabilizar as transações (como cartórios, instituições financeiras para financiamento imobiliário e os órgãos anuentes na escrituração do imóvel).
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">5. Direitos do Titular dos Dados</h3>
            <p className="text-gray-650">
              Conforme previsto nos Artigos 17 e 18 da LGPD, você possui direitos assegurados sobre as suas informações corporativas e dados pessoais:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-2">
                <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                <span className="text-xs font-semibold text-gray-700">Confirmação de existência do tratamento e acesso imediato aos dados.</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-2">
                <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                <span className="text-xs font-semibold text-gray-700">Correção de dados incompletos, inexatos ou desatualizados.</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-2">
                <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                <span className="text-xs font-semibold text-gray-700">Eliminação dos dados pessoais tratados com base no consentimento do usuário.</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start space-x-2">
                <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                <span className="text-xs font-semibold text-gray-700">Portabilidade dos dados e revogação do consentimento concedido.</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Para exercer seus direitos de exclusão ou retificação de dados pessoais, entre em contato imediatamente por nosso canal administrativo.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#1d2d3d]">6. Segurança e Armazenamento dos Dados</h3>
            <p className="text-gray-650">
              Implementamos medidas técnicas rígidas e controles corporativos adequados, como criptografia de ponta no tráfego, sessões administrativas protegidas e servidores gerenciados (Cloud SQL/Supabase) protegidos de forma a prevenir incidentes digitais ou invasões cibernéticas.
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
