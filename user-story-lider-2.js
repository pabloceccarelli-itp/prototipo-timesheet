// HU - Líder 2: Ver resumen semanal del equipo en un proyecto
// Ejemplos:
// "Mostrame todas las horas cargadas en proyecto Beta de esta semana."
// "Mostrame todas las horas cargadas en proyecto Beta de la semana pasada."
// "Mostrame todas las horas cargadas en proyecto Beta de la semana que viene."

// Parsea consultas del líder tipo: "Mostrame todas las horas cargadas en proyecto Beta de esta semana"
// Acepta: "esta semana", "la semana pasada", "semana pasada", "la semana que viene", "semana que viene"
function parseLeaderTeamQuery(text) {
	const t = text.trim();

	// Patrones para diferentes períodos
	const patterns = [
		// "esta semana"
		/m(ue|o)strame\s+todas\s+las\s+horas\s+cargadas\s+en\s+proyecto\s+(.+?)\s+de\s+esta\s+semana\.?$/i,
		// "la semana pasada" o "semana pasada"
		/m(ue|o)strame\s+todas\s+las\s+horas\s+cargadas\s+en\s+proyecto\s+(.+?)\s+de\s+(?:la\s+)?semana\s+pasada\.?$/i,
		// "la semana que viene" o "semana que viene"
		/m(ue|o)strame\s+todas\s+las\s+horas\s+cargadas\s+en\s+proyecto\s+(.+?)\s+de\s+(?:la\s+)?semana\s+que\s+viene\.?$/i
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

	const proyecto = match[2].trim();

	if (!proyecto) return null;

	return {
		proyecto,
		periodo
	};
}

// Filtra tareas por proyecto y rango de fechas (sin filtrar por usuario específico)
// Solo incluye tareas con horas > 0 y excluye feriados (id_usuario === 0)
function filterTasksForProject(proyecto, startDate, endDate) {
	return tasksDatabase.filter((t) => {
		// Excluir feriados
		if (t.id_usuario === 0) return false;
		// Solo tareas con horas
		if (!t.horas || t.horas <= 0) return false;
		// Filtrar por proyecto
		if (!t.proyecto || String(t.proyecto).toLowerCase() !== proyecto.toLowerCase()) return false;
		// Filtrar por rango de fechas
		const f = t.fecha_inicio;
		return f >= startDate && f <= endDate;
	});
}

// Resume horas por usuario y total para el equipo
function summarizeTeamTasksByUser(tasks) {
	const byUser = {};
	let total = 0;
	tasks.forEach((t) => {
		const name = t.usuario || `Usuario ${t.id_usuario}`;
		if (!byUser[name]) byUser[name] = 0;
		byUser[name] += t.horas;
		total += t.horas;
	});
	return { byUser, total };
}

// Crea mensaje para el chatbot con el resumen del equipo
function buildTeamSummaryMessage({ proyecto, start, end, periodo, tasks }) {
	const { byUser, total } = summarizeTeamTasksByUser(tasks);
	const rango = `${formatDateForDisplay(start)} al ${formatDateForDisplay(end)}`;

	// Ordenar usuarios por horas (mayor a menor)
	const sortedUsers = Object.entries(byUser)
		.sort((a, b) => b[1] - a[1])
		.map(([name, hours]) => `• ${name}: ${hours}h`);

	// Si no hay tareas, mostrar mensaje especial
	if (sortedUsers.length === 0) {
		const periodoDisplay = periodo === 'esta semana' ? 'esta semana' : 
		                       periodo === 'semana pasada' ? 'la semana pasada' : 
		                       'la semana que viene';
		return `No se encontraron horas cargadas en el proyecto "${proyecto}" para ${periodoDisplay} (${rango}).`;
	}

	// Mostrar período en el header
	const periodoDisplay = periodo === 'esta semana' ? 'esta semana' : 
	                       periodo === 'semana pasada' ? 'la semana pasada' : 
	                       'la semana que viene';
	const header = `Resumen de horas del equipo en proyecto "${proyecto}" (${periodoDisplay}, ${rango}):`;
	const totalLine = `Total del equipo: ${total}h`;
	const tasksCount = tasks.length;
	const tasksLine = `${tasksCount} tarea${tasksCount !== 1 ? 's' : ''} registrada${tasksCount !== 1 ? 's' : ''}`;

	// Sugerir descarga
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;

	return `${header}\n${sortedUsers.join('\n')}\n${totalLine}\n${tasksLine}\n\n${footer}`;
}

// Procesa la consulta del líder para ver resumen del equipo y responde en el chatbot con botón de descarga
function processLeaderTeamCommand(text) {
	const parsed = parseLeaderTeamQuery(text);
	if (!parsed) return false;

	const { start, end } = getDateRangeForPeriod(parsed.periodo);

	// Filtrar todas las tareas del proyecto en el período (sin filtrar por usuario)
	const filtered = filterTasksForProject(parsed.proyecto, start, end);

	const message = buildTeamSummaryMessage({
		proyecto: parsed.proyecto,
		start,
		end,
		periodo: parsed.periodo,
		tasks: filtered
	});

	// Si no hay tareas, solo mostrar el mensaje sin opción de descarga
	if (filtered.length === 0) {
		addMessage(message);
		return true;
	}

	// Mostrar confirmación de descarga
	showConfirmation(
		message,
		function () {
			// Confirmó descargar
			const rangoNombre = `${start}_a_${end}`;
			const filename = `horas_equipo_${parsed.proyecto.replace(/\s+/g, '_')}_${rangoNombre}.csv`;
			downloadLeaderCSV(filename, filtered);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);

	return true;
}

