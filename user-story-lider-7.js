// HU - Líder 7: Revisar miembros sin horas cargadas en un proyecto
// Ejemplo:
// “¿Quién no cargó nada en proyecto Alfa esta semana?”

// Parsea consultas del líder tipo: "¿Quién no cargó nada en proyecto Alfa esta semana?"
// Acepta: "esta semana", "la semana pasada", "semana pasada", "la semana que viene", "semana que viene"
function parseLeaderNoHoursQuery(text) {
	const t = text.trim();

	const patterns = [
		/¿?qui[ée]n\s+no\s+carg[óo]\s+nada\s+en\s+proyecto\s+(.+?)\s+esta\s+semana\??\.?$/i,
		/¿?qui[ée]n\s+no\s+carg[óo]\s+nada\s+en\s+proyecto\s+(.+?)\s+(?:la\s+)?semana\s+pasada\??\.?$/i,
		/¿?qui[ée]n\s+no\s+carg[óo]\s+nada\s+en\s+proyecto\s+(.+?)\s+(?:la\s+)?semana\s+que\s+viene\??\.?$/i
	];

	let match = null;
	let periodo = null;

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

// Obtiene la lista de usuarios asignados a un proyecto desde usuarios_proyectos
function getUsersForProject(proyecto) {
	if (!Array.isArray(usuarios_proyectos)) return [];
	return usuarios_proyectos.filter(
		(u) => u.proyecto && String(u.proyecto).toLowerCase() === proyecto.toLowerCase()
	);
}

// Calcula usuarios sin horas cargadas en el período
function getUsersWithoutHours(proyecto, startDate, endDate) {
	const users = getUsersForProject(proyecto);
	if (users.length === 0) return [];

	return users.filter((user) => {
		const hasHours = tasksDatabase.some((t) => {
			if (t.id_usuario === 0) return false; // ignorar feriados
			if (!t.horas || t.horas <= 0) return false;
			if (t.id_usuario !== user.id_usuario) return false;
			if (!t.proyecto || String(t.proyecto).toLowerCase() !== proyecto.toLowerCase()) return false;
			const f = t.fecha_inicio;
			return f >= startDate && f <= endDate;
		});
		return !hasHours;
	});
}

// Construye mensaje para el chatbot
function buildNoHoursMessage({ proyecto, periodo, start, end, missingUsers }) {
	const periodoDisplay =
		periodo === 'esta semana'
			? 'esta semana'
			: periodo === 'semana pasada'
			? 'la semana pasada'
			: 'la semana que viene';
	const rango = `${formatDateForDisplay(start)} al ${formatDateForDisplay(end)}`;

	if (missingUsers.length === 0) {
		return `✅ Todos los miembros asignados al proyecto "${proyecto}" cargaron horas ${periodoDisplay} (${rango}).`;
	}

	const header = `Miembros sin horas cargadas en el proyecto "${proyecto}" ${periodoDisplay} (${rango}):`;
	const userLines = missingUsers.map((u) => `• ${u.usuario}`);
	const footer = `¿Querés descargar el listado en Excel (CSV)?`;

	return `${header}\n${userLines.join('\n')}\n\n${footer}`;
}

// Descarga CSV con usuarios sin horas
function downloadMissingUsersCSV(filename, missingUsers, proyecto, start, end) {
	const header = ['Usuario', 'Proyecto', 'Rango', 'HorasCargadas'];
	const rango = `${start} a ${end}`;
	const rows = missingUsers.map((u) => [u.usuario, proyecto, rango, 0]);
	const csvLines = [header.join(',')].concat(rows.map((r) => r.join(',')));

	const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// Procesa la consulta del líder para encontrar usuarios sin horas cargadas
function processLeaderNoHoursCommand(text) {
	const parsed = parseLeaderNoHoursQuery(text);
	if (!parsed) return false;

	const { start, end } = getDateRangeForPeriod(parsed.periodo);
	const missingUsers = getUsersWithoutHours(parsed.proyecto, start, end);

	const message = buildNoHoursMessage({
		proyecto: parsed.proyecto,
		periodo: parsed.periodo,
		start,
		end,
		missingUsers
	});

	// Si no hay usuarios faltantes, solo mostrar mensaje
	if (missingUsers.length === 0) {
		addMessage(message);
		return true;
	}

	showConfirmation(
		message,
		function () {
			const rangoNombre = `${start}_a_${end}`;
			const filename = `sin_horas_${parsed.proyecto.replace(/\s+/g, '_')}_${rangoNombre}.csv`;
			downloadMissingUsersCSV(filename, missingUsers, parsed.proyecto, start, end);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);

	return true;
}
