import React, { useState } from 'react';

/**
 * HelpModule — Chanak International Academy SIS
 * Módulo de ayuda contextual por rol.
 * Props:
 *   role: 'parent' | 'family' | 'student' | 'tutor' | 'coordinator' | 'admin' | 'super_admin' | 'director'
 */

const SUPPORT_SECTION = {
  title: 'Soporte Técnico',
  items: [
    {
      question: '¿Cómo contactar soporte?',
      answer: `Para soporte técnico o administrativo, contacte a:\n\nadministration@chanakacademy.org\n\nAl escribir, incluya:\n• Nombre del estudiante\n• Su rol en el sistema (padre, tutor, coordinador...)\n• Descripción del problema\n• Captura de pantalla si es posible\n\nTiempo de respuesta estimado: 24-48 horas hábiles.`,
    },
  ],
};

const ROLE_CONTENT = {
  'parent': {
    title: 'Guía para Familias',
    sections: [
      {
        title: '¿Cómo ver a mis hijos?',
        content: 'Desde el menú principal selecciona "Mis Estudiantes". Verás el perfil académico de cada hijo inscrito.',
      },
      {
        title: '¿Cómo subir evidencias?',
        content: 'Entra al perfil del estudiante y selecciona "Evidencias". Sube el archivo, indica el tipo (PACE Test, Self Test, etc.), la asignatura y el número de PACE si aplica.',
      },
      {
        title: '¿Cómo revisar documentos?',
        content: 'En la sección "Documentos" encontrarás los documentos publicados por la institución: contrato, carta de matrícula, boletines.',
      },
      {
        title: '¿Cómo ver boletines?',
        content: 'Los boletines publicados aparecen en la sección "Boletines" del perfil del estudiante.',
      },
      {
        title: '¿Cómo reportar una incidencia?',
        content: 'Ver la sección Soporte Técnico al final de esta guía.',
      },
    ],
  },
  'student': {
    title: 'Guía para Estudiantes',
    sections: [
      {
        title: '¿Cómo ver mi avance?',
        content: 'En tu panel principal verás un resumen de tus materias y el estado de tus evidencias.',
      },
      {
        title: '¿Cómo ver mis materias?',
        content: 'La sección "Mis Materias" muestra las asignaturas asignadas para el año académico actual.',
      },
      {
        title: '¿Cómo revisar evidencias y notas?',
        content: 'En "Evidencias" puedes ver el estado de cada evidencia enviada y si está aprobada, pendiente o requiere corrección.',
      },
      {
        title: '¿Cómo ver boletines publicados?',
        content: 'Los boletines aparecen en la sección "Boletines" de tu perfil.',
      },
    ],
  },
  'tutor': {
    title: 'Guía para Tutores',
    sections: [
      {
        title: '¿Cómo revisar evidencias?',
        content: 'En la sección "Revisión de Evidencias" aparecen todas las evidencias pendientes de los estudiantes asignados. Filtra por estado o asignatura.',
      },
      {
        title: '¿Cómo aprobar o solicitar corrección?',
        content: 'En cada evidencia encontrarás los botones: Aprobar, Solicitar Corrección, Rechazar. Al aprobar un PACE Test con nota ≥80, se genera la calificación oficial automáticamente.',
      },
      {
        title: '¿Cómo revisar notas?',
        content: 'La sección "Revisión de Notas" muestra las calificaciones enviadas para verificación antes de publicar el boletín.',
      },
      {
        title: '¿Cómo ver PEI y PACEs?',
        content: 'Desde el perfil del estudiante puedes acceder al PEI activo y al historial de PACEs completados.',
      },
    ],
  },
  'coordinator': {
    title: 'Guía para Coordinadores',
    sections: [
      {
        title: '¿Cómo revisar estudiantes de mi Hub?',
        content: 'En el panel de Coordinador verás todos los estudiantes asignados a tu Hub. Puedes filtrar por estado, año académico o asignatura.',
      },
      {
        title: '¿Cómo revisar evidencias y notas?',
        content: 'Las secciones "Evidencias" y "Revisión de Notas" muestran el flujo completo del Hub. Puedes aprobar o devolver con comentarios.',
      },
      {
        title: '¿Cómo ver alertas?',
        content: 'Las alertas activas aparecen en la parte superior del panel. Indican estudiantes con bajo rendimiento, evidencias vencidas o documentos pendientes.',
      },
      {
        title: '¿Cómo revisar boletines?',
        content: 'Antes de publicar, los boletines se muestran en estado borrador para revisión del coordinador.',
      },
    ],
  },
  'admin': {
    title: 'Guía de Administración',
    sections: [
      {
        title: '¿Cómo gestionar estudiantes?',
        content: 'En "Estudiantes" puedes buscar, crear, editar y archivar estudiantes. Cada ficha incluye datos personales, académicos y de expediente.',
      },
      {
        title: '¿Cómo gestionar usuarios?',
        content: 'En "Usuarios" puedes crear cuentas para padres, tutores y coordinadores, asignar roles y asociar estudiantes.',
      },
      {
        title: '¿Cómo emitir cartas de matrícula?',
        content: 'En "Cartas de Matrícula" selecciona el estudiante, edita el texto si es necesario y genera el PDF en español o inglés.',
      },
      {
        title: '¿Cómo crear contratos?',
        content: 'En "Contratos" crea un nuevo contrato Off-Campus, edita los datos de la familia y los importes si es necesario, luego envía para firma.',
      },
      {
        title: '¿Cómo publicar documentos?',
        content: 'Los documentos en estado "borrador" se publican desde la sección de gestión documental. Al publicar quedan visibles para la familia.',
      },
    ],
  },
};

// Role aliases
ROLE_CONTENT['family'] = ROLE_CONTENT['parent'];
ROLE_CONTENT['super_admin'] = ROLE_CONTENT['admin'];
ROLE_CONTENT['director'] = ROLE_CONTENT['admin'];

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <span className="font-bold text-slate-800 text-sm">{question}</span>
        <span className="text-slate-400 text-lg ml-4 shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

function RoleSection({ title, sections }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-teal-500 rounded-full inline-block" />
        {title}
      </h2>
      <div className="space-y-2">
        {sections.map((item) => (
          <AccordionItem key={item.title} question={item.title} answer={item.content} />
        ))}
      </div>
    </div>
  );
}

export default function HelpModule({ role }) {
  const normalizedRole = String(role || '').toLowerCase().trim();
  const content = ROLE_CONTENT[normalizedRole];

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
        <h1 className="text-xl font-black text-teal-900">Centro de Ayuda — Chanak SIS</h1>
        <p className="text-sm text-teal-700 mt-1">Encuentra respuestas a las preguntas más frecuentes según tu rol.</p>
      </div>

      {content ? (
        <RoleSection title={content.title} sections={content.sections} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-sm font-medium">
          No hay contenido de ayuda configurado para el rol "{role}". Contacta a administración.
        </div>
      )}

      {/* Soporte — visible para todos los roles */}
      <div className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block" />
          {SUPPORT_SECTION.title}
        </h2>
        <div className="space-y-2">
          {SUPPORT_SECTION.items.map((item) => (
            <AccordionItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </div>
  );
}
