import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Users, Building2, FileSignature, AlertCircle, UserPlus, 
  FilePlus, ArrowRight, Loader2, FileText, BookOpen, 
  Search, Edit, CheckCircle2, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Electives'
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubjectForGrade, setSelectedSubjectForGrade] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [gradeStatus, setGradeStatus] = useState('pending');

  // ===============================
  // LOAD STUDENTS (CORREGIDO)
  // ===============================
  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, us_grade_level, grade_label')
      .order('last_name');

    setStudents(data || []);
    setFilteredStudents(data || []);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredStudents(students);
    } else {
      const lower = search.toLowerCase();
      setFilteredStudents(students.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(lower)
      ));
    }
  }, [search, students]);

  // ===============================
  // LOAD SUBJECTS (DEDUPLICADO REAL)
  // ===============================
  const loadAcademicSubjects = async () => {
    if (!selectedStudent) return;

    setIsLoadingSubjects(true);

    const { data } = await supabase
      .from('student_subjects')
      .select('*')
      .eq('student_id', selectedStudent.id)
      .eq('school_year', '2025-2026')
      .eq('quarter', selectedQuarter);

    // 🔥 deduplicación real
    const unique = [];
    const seen = new Set();

    for (const item of data || []) {
      const key = `${item.subject_name}__${item.academic_block}__${item.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    setAcademicSubjects(unique);
    setIsLoadingSubjects(false);
  };

  useEffect(() => {
    loadAcademicSubjects();
  }, [selectedStudent, selectedQuarter]);

  // ===============================
  // DROPDOWN LIMPIO
  // ===============================
  const uniqueSubjectsForSelect = academicSubjects.filter((subject, index, self) => {
    const key = `${subject.subject_name}__${subject.academic_block}`;
    return index === self.findIndex(s => `${s.subject_name}__${s.academic_block}` === key);
  });

  // ===============================
  // GROUPING
  // ===============================
  const groupedSubjects = BLOCK_ORDER.reduce((acc, block) => {
    acc[block] = [];
    return acc;
  }, {});

  academicSubjects.forEach(sub => {
    const block = sub.academic_block || 'Electives';
    if (groupedSubjects[block]) {
      groupedSubjects[block].push(sub);
    } else {
      if (!groupedSubjects['Other']) groupedSubjects['Other'] = [];
      groupedSubjects['Other'].push(sub);
    }
  });

  // ===============================
  // SAVE GRADE
  // ===============================
  const handleSaveGrade = async (e) => {
    e.preventDefault();

    await supabase
      .from('student_subjects')
      .update({
        grade: gradeValue ? parseFloat(gradeValue) : null,
        approval_status: gradeStatus,
        submitted_at: new Date().toISOString()
      })
      .eq('id', selectedSubjectForGrade);

    setIsGradeModalOpen(false);
    loadAcademicSubjects();
  };

  return (
    <div className="p-6 space-y-6">

      {/* SELECT STUDENT */}
      <div>
        <select
          onChange={(e) => {
            const student = students.find(s => s.id === e.target.value);
            setSelectedStudent(student);
          }}
          className="p-3 border rounded"
        >
          <option>Seleccionar estudiante</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name} ({s.grade_label || s.us_grade_level})
            </option>
          ))}
        </select>
      </div>

      {/* SUBJECTS */}
      {isLoadingSubjects ? (
        <Loader2 className="animate-spin" />
      ) : (
        Object.entries(groupedSubjects).map(([block, subjects]) => {
          if (!subjects.length) return null;

          return (
            <div key={block} className="border rounded-xl p-4">
              <h3 className="font-bold mb-3">{block}</h3>

              {subjects.map(sub => (
                <div key={sub.id} className="flex justify-between py-2 border-b">
                  <span>{sub.subject_name}</span>
                  <button
                    onClick={() => {
                      setSelectedSubjectForGrade(sub.id);
                      setIsGradeModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          );
        })
      )}

      {/* MODAL */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form onSubmit={handleSaveGrade} className="bg-white p-6 rounded-xl space-y-4">

            <select
              value={selectedSubjectForGrade}
              onChange={(e) => setSelectedSubjectForGrade(e.target.value)}
              className="border p-2 w-full"
            >
              {uniqueSubjectsForSelect.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={gradeValue}
              onChange={(e) => setGradeValue(e.target.value)}
              placeholder="Nota"
              className="border p-2 w-full"
            />

            <select
              value={gradeStatus}
              onChange={(e) => setGradeStatus(e.target.value)}
              className="border p-2 w-full"
            >
              <option value="pending">Pendiente</option>
              <option value="submitted">Enviado</option>
              <option value="approved">Aprobado</option>
            </select>

            <button className="bg-blue-600 text-white px-4 py-2 rounded">
              Guardar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}