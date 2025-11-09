import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { UserCircle, Briefcase, Upload } from 'lucide-react'

const RegisterForm = ({ onRegister, onBack }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "emprendedor",
    programType: "",
    experience: "",
    mentorProgramType: "",
    specialization: "",
    curriculum: null,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const specializationOptions = {
    preincubacion: [
      { value: "financiera", label: "Asesoría Financiera" },
      { value: "contable", label: "Asesoría Contable y Tributario" },
      { value: "comercializacion", label: "Asesoría en Comercialización" },
      { value: "diseno", label: "Asesoría en Diseño Gráfico" },
    ],
    incubacion: [
      { value: "legal", label: "Asesoría Legal" },
      { value: "marketing", label: "Asesoría en Marketing Digital" },
      { value: "software", label: "Asesoría en Software y Desarrollo" },
    ],
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    if (name === 'mentorProgramType') {
      setFormData({ ...formData, [name]: value, specialization: '' })
    }
    setError('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!validTypes.includes(file.type)) {
        setError('Por favor sube un archivo PDF o Word')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no debe superar 5MB')
        return
      }
      setFormData({ ...formData, curriculum: file })
      setError('')
    }
  }

  const handleRoleSelect = (role) => {
    setFormData({
      ...formData,
      role,
      programType: "",
      experience: "",
      mentorProgramType: "",
      specialization: "",
      curriculum: null,
    })
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      setError("Todos los campos son obligatorios")
      return
    }
    if (formData.password.length < 6) {
      setError("Contraseña muy débil, mínimo 6 caracteres")
      return
    }

    // Validaciones específicas por rol
    if (formData.role === "emprendedor") {
      if (!formData.programType) {
        setError("Por favor selecciona el tipo de programa")
        return
      }
    }

    if (formData.role === "mentor") {
      if (!formData.experience || formData.experience.length < 50) {
        setError("Por favor describe tu experiencia (mínimo 50 caracteres)")
        return
      }
      if (!formData.mentorProgramType) {
        setError("Por favor selecciona el tipo de programa de mentoría")
        return
      }
      if (!formData.specialization) {
        setError("Por favor selecciona tu especialización")
        return
      }
    }

    setLoading(true)
    try {
      await onRegister(formData)
    } catch (err) {
      setError(err.message || 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-8">
      <motion.div
        className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Únete a Innovug!</h2>
          <p className="text-gray-600">Crea tu cuenta y empieza a agendar mentorías.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Selecciona tu Rol</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect("emprendedor")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  formData.role === "emprendedor"
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 hover:border-blue-300"
                }`}
              >
                <UserCircle
                  className={`w-8 h-8 mb-2 ${formData.role === "emprendedor" ? "text-blue-600" : "text-gray-400"}`}
                />
                <span
                  className={`font-semibold ${formData.role === "emprendedor" ? "text-blue-600" : "text-gray-600"}`}
                >
                  Emprendedor
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("mentor")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  formData.role === "mentor"
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 hover:border-blue-300"
                }`}
              >
                <Briefcase
                  className={`w-8 h-8 mb-2 ${formData.role === "mentor" ? "text-blue-600" : "text-gray-400"}`}
                />
                <span className={`font-semibold ${formData.role === "mentor" ? "text-blue-600" : "text-gray-600"}`}>
                  Mentor
                </span>
              </button>
            </div>
          </div>

          {/* Campos básicos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Tu nombre aquí"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="tunombre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {formData.role === "emprendedor" && (
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Programa</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, programType: "preincubacion" })}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    formData.programType === "preincubacion"
                      ? "border-blue-500 bg-blue-50 shadow-md text-blue-600"
                      : "border-gray-300 hover:border-blue-300 text-gray-600"
                  }`}
                >
                  <span className="font-semibold">Preincubación</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, programType: "incubacion" })}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    formData.programType === "incubacion"
                      ? "border-blue-500 bg-blue-50 shadow-md text-blue-600"
                      : "border-gray-300 hover:border-blue-300 text-gray-600"
                  }`}
                >
                  <span className="font-semibold">Incubación</span>
                </button>
              </div>
            </div>
          )}

          {formData.role === "mentor" && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              {/* Experiencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiencia Profesional <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe tu experiencia profesional, logros y por qué quieres ser mentor..."
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 50 caracteres</p>
              </div>

              {/* Tipo de Programa de Mentoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Programa de Mentoría <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: "mentorProgramType", value: "preincubacion" } })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.mentorProgramType === "preincubacion"
                        ? "border-blue-500 bg-blue-50 shadow-md text-blue-600"
                        : "border-gray-300 hover:border-blue-300 text-gray-600"
                    }`}
                  >
                    <span className="font-semibold">Preincubación</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange({ target: { name: "mentorProgramType", value: "incubacion" } })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.mentorProgramType === "incubacion"
                        ? "border-blue-500 bg-blue-50 shadow-md text-blue-600"
                        : "border-gray-300 hover:border-blue-300 text-gray-600"
                    }`}
                  >
                    <span className="font-semibold">Incubación</span>
                  </button>
                </div>
              </div>

              {/* Especialización */}
              {formData.mentorProgramType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialización <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Selecciona una especialización</option>
                    {specializationOptions[formData.mentorProgramType].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Curriculum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum Vitae (Opcional)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="curriculum-upload"
                  />
                  <label
                    htmlFor="curriculum-upload"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 cursor-pointer transition-all"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">
                      {formData.curriculum ? formData.curriculum.name : "Subir CV (PDF o Word, máx 5MB)"}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-sky-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <button onClick={onBack} className="w-full text-blue-600 py-2 text-sm font-medium hover:underline">
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </motion.div>
    </div>
  )
}

export default RegisterForm