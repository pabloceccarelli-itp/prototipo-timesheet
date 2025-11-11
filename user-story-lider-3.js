// HU - Líder 3: Detectar miembros con horas faltantes en un proyecto
// Ejemplos:
// "¿Quién no cargó todas las horas en proyecto Alfa esta semana?"
// "¿Quién no cargó todas las horas en proyecto Alfa la semana pasada?"
// "¿Quién no cargó todas las horas en proyecto Alfa la semana que viene?"

// Parsea consultas del líder tipo: "¿Quién no cargó todas las horas en proyecto Alfa esta semana?"
// Acepta: "esta semana", "la semana pasada", "semana pasada", "la semana que viene", "semana que viene"
function parseLeaderMissingHoursQuery(text) {
	const t = text.trim();

	// Patrones para diferentes períodos
	const patterns = [
		// "esta semana"
		/¿?qui[ée]n\s+no\s+carg[óo]\s+todas\s+las\s+horas\s+en\s+proyecto\s+(.+?)\s+esta\s+semana\??\.?$/i,
		// "la semana pasada" o "semana pasada"
		/¿?qui[ée]n\s+no\s+carg[óo]\s+todas\s+las\s+horas\s+en\s+proyecto\s+(.+?)\s+(?:la\s+)?semana\s+pasada\??\.?$/i,
		// "la semana que viene" o "semana que viene"
		/¿?qui[ée]n\s+no\s+carg[óo]\s+todas\s+las\s+horas\s+en\s+proyecto\s+(.+?)\s+(?:la\s+)?semana\s+que\s+viene\??\.?$/i
	];

	let match = null;
	let periodo = null;

	// Intentar cada patrón
	for (let i = 0; i < patterns.length; i++) {
		match = t.match(patterns[i]);
		if (match) {
			if (i === 0) periodo = 'esta semana';
			else if (i === 1) periodo = 'semana pasada';
			else if (i === 2) periodo = 'semana que viene';
			break;
		}
	}

	if (!match || !periodo) return null;

	const proyecto = match[1].trim();

	if (!proyecto) return null;

	return {
		proyecto,
		periodo
	};
}

// Obtiene todas las fechas de una semana (lunes a domingo) en formato YYYY-MM-DD
function getAllWeekDates(startDate, endDate) {
	const dates = [];
	const start = new Date(startDate + 'T00:00:00');
	const end = new Date(endDate + 'T00:00:00');
	
	let current = new Date(start);
	while (current <= end) {
		dates.push(formatDate(current.getFullYear(), current.getMonth() + 1, current.getDate()));
		current.setDate(current.getDate() + 1);
	}
	
	return dates;
}

// Calcula días laborables en un rango de fechas (excluyendo fines de semana y feriados)
function calculateWorkingDaysInWeek(startDate, endDate) {
	const allDates = getAllWeekDates(startDate, endDate);
	let workingDays = 0;
	
	allDates.forEach(dateStr => {
		const date = new Date(dateStr + 'T00:00:00');
		const dayOfWeek = date.getDay();
		
		// Excluir fines de semana
		if (dayOfWeek === 0 || dayOfWeek === 6) return;
		
		// Verificar si hay un feriado (id_usuario === 0) en este día
		const tasksForDay = getTasksForDate(dateStr);
		const isHoliday = tasksForDay.some(t => t && t.id_usuario === 0);
		if (isHoliday) return;
		
		workingDays++;
	});
	
	return workingDays;
}

// Calcula horas faltantes por usuario en un proyecto para una semana
function calculateMissingHoursByUser(proyecto, startDate, endDate) {
	// Obtener todas las tareas del proyecto en el período
	const tasks = filterTasksForProject(proyecto, startDate, endDate);
	
	// Calcular días laborables de la semana
	const workingDays = calculateWorkingDaysInWeek(startDate, endDate);
	const expectedHours = workingDays * 8;
	
	// Agrupar horas por usuario
	const hoursByUser = {};
	tasks.forEach(t => {
		const name = t.usuario || `Usuario ${t.id_usuario}`;
		if (!hoursByUser[name]) {
			hoursByUser[name] = {
				userId: t.id_usuario,
				hoursLoaded: 0,
				expectedHours: expectedHours,
				missingHours: 0
			};
		}
		hoursByUser[name].hoursLoaded += t.horas;
	});
	
	// Calcular horas faltantes y filtrar solo los que tienen horas faltantes
	const missingHoursList = [];
	Object.entries(hoursByUser).forEach(([name, data]) => {
		data.missingHours = Math.max(0, data.expectedHours - data.hoursLoaded);
		if (data.missingHours > 0) {
			missingHoursList.push({
				name,
				userId: data.userId,
				hoursLoaded: data.hoursLoaded,
				expectedHours: data.expectedHours,
				missingHours: data.missingHours
			});
		}
	});
	
	// Ordenar por horas faltantes (mayor a menor)
	missingHoursList.sort((a, b) => b.missingHours - a.missingHours);
	
	return {
		missingHoursList,
		workingDays,
		expectedHours
	};
}

// Crea mensaje para el chatbot con el resumen de horas faltantes
function buildMissingHoursMessage({ proyecto, start, end, periodo, missingHoursList, workingDays, expectedHours }) {
	const rango = `${formatDateForDisplay(start)} al ${formatDateForDisplay(end)}`;
	
	// Mostrar período en el header
	const periodoDisplay = periodo === 'esta semana' ? 'esta semana' : 
	                       periodo === 'semana pasada' ? 'la semana pasada' : 
	                       'la semana que viene';
	
	if (missingHoursList.length === 0) {
		return `✅ Todos los miembros del equipo completaron sus horas en el proyecto "${proyecto}" para ${periodoDisplay} (${rango}).\n\nDías laborables: ${workingDays} (${expectedHours}h esperadas)`;
	}
	
	const header = `Miembros con horas faltantes en proyecto "${proyecto}" (${periodoDisplay}, ${rango}):`;
	const workingDaysLine = `Días laborables: ${workingDays} (${expectedHours}h esperadas por persona)`;
	
	// Líneas por usuario con horas faltantes
	const userLines = missingHoursList.map(u => {
		return `• ${u.name}: ${u.hoursLoaded}h cargadas, ${u.missingHours}h faltantes`;
	});
	
	const totalMissing = missingHoursList.reduce((sum, u) => sum + u.missingHours, 0);
	const totalLine = `Total de horas faltantes: ${totalMissing}h`;
	
	// Sugerir descarga
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;
	
	return `${header}\n${workingDaysLine}\n\n${userLines.join('\n')}\n\n${totalLine}\n\n${footer}`;
}

// Procesa la consulta del líder para detectar horas faltantes y responde en el chatbot
function processLeaderMissingHoursCommand(text) {
	const parsed = parseLeaderMissingHoursQuery(text);
	if (!parsed) return false;
	
	const { start, end } = getDateRangeForPeriod(parsed.periodo);
	
	// Calcular horas faltantes por usuario
	const { missingHoursList, workingDays, expectedHours } = calculateMissingHoursByUser(
		parsed.proyecto,
		start,
		end
	);
	
	const message = buildMissingHoursMessage({
		proyecto: parsed.proyecto,
		start,
		end,
		periodo: parsed.periodo,
		missingHoursList,
		workingDays,
		expectedHours
	});
	
	// Si no hay horas faltantes, solo mostrar el mensaje sin opción de descarga
	if (missingHoursList.length === 0) {
		addMessage(message);
		return true;
	}
	
	// Obtener todas las tareas del proyecto para el CSV
	const allTasks = filterTasksForProject(parsed.proyecto, start, end);
	
	// Mostrar confirmación de descarga
	showConfirmation(
		message,
		function () {
			// Confirmó descargar
			const rangoNombre = `${start}_a_${end}`;
			const filename = `horas_faltantes_${parsed.proyecto.replace(/\s+/g, '_')}_${rangoNombre}.csv`;
			downloadLeaderCSV(filename, allTasks);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);
	
	return true;
}

