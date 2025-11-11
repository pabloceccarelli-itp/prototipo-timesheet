// HU - Líder 1: Revisar horas de un colaborador en un proyecto
// Ejemplos:
// “Mostrame las horas de Juan en proyecto Alfa esta semana.”
// “Mostrame las horas de Juan y María en proyecto Alfa esta semana.”

// Obtiene inicio (lunes) y fin (domingo) de la semana actual en formato YYYY-MM-DD
function getLeaderThisWeekRange() {
	// Basado en la zona local del navegador
	const today = new Date();
	const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ...
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

	const monday = new Date(today);
	monday.setHours(0, 0, 0, 0);
	monday.setDate(today.getDate() + mondayOffset);

	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	const start = formatDate(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
	const end = formatDate(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
	return { start, end };
}

// Parsea consultas del líder tipo: "Mostrame las horas de Juan y María en proyecto Alfa esta semana"
function parseLeaderQuery(text) {
	const t = text.trim();

	// Aceptar "Mostrame" o "Muestrame" (variación sin tilde), "las horas de ... en proyecto ... esta semana"
	// Captura lista de nombres y proyecto
	const regex = /m(ue|o)strame\s+las\s+horas\s+de\s+(.+?)\s+en\s+proyecto\s+(.+?)\s+esta\s+semana\.?$/i;
	const m = t.match(regex);
	if (!m) return null;

	const rawNames = m[2].trim();
	const proyecto = m[3].trim();

	// Separar por " y " y por comas
	const names = rawNames
		.split(/\s*,\s*|\s+y\s+/i)
		.map((n) => n.trim())
		.filter((n) => n.length > 0);

	if (names.length === 0 || !proyecto) return null;

	return {
		names,
		proyecto
	};
}

// Construye un mapa nombre->ids a partir de tasksDatabase
function buildUserNameToIdsMap() {
	const map = {};
	tasksDatabase.forEach((t) => {
		if (t.id_usuario && t.usuario) {
			const key = String(t.usuario).trim().toLowerCase();
			if (!map[key]) map[key] = new Set();
			map[key].add(t.id_usuario);
		}
	});
	// Convertir Sets a arrays
	const out = {};
	Object.keys(map).forEach((k) => (out[k] = Array.from(map[k])));
	return out;
}

// Filtra tareas por proyecto, ids de usuario y rango de fechas (inclusive)
function filterTasksForLeader(proyecto, userIds, startDate, endDate) {
	return tasksDatabase.filter((t) => {
		if (!t.horas || t.horas <= 0) return false;
		if (!t.proyecto || String(t.proyecto).toLowerCase() !== proyecto.toLowerCase()) return false;
		if (!userIds.includes(t.id_usuario)) return false;
		const f = t.fecha_inicio;
		return f >= startDate && f <= endDate;
	});
}

// Resume horas por usuario y total
function summarizeTasksByUser(tasks) {
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

// Crea mensaje HTML para el chatbot con el resumen
function buildLeaderSummaryMessage({ proyecto, start, end, namesRequested, tasks }) {
	const { byUser, total } = summarizeTasksByUser(tasks);
	const rango = `${formatDateForDisplay(start)} al ${formatDateForDisplay(end)}`;

	// Línea por usuario solicitado (aunque no tenga tareas)
	const userLines = namesRequested.map((n) => {
		// Buscar nombre con capitalización según existencia en byUser
		const foundKey = Object.keys(byUser).find((k) => k.toLowerCase() === n.toLowerCase());
		const displayName = foundKey || n;
		const hs = foundKey ? byUser[foundKey] : 0;
		return `• ${displayName}: ${hs}h`;
	});

	const header = `Resumen de horas en proyecto "${proyecto}" (${rango}):`;
	const totalLine = `Total: ${total}h`;

	// Sugerir descarga
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;

	return `${header}\n${userLines.join('\n')}\n${totalLine}\n\n${footer}`;
}

// Exporta a CSV y dispara descarga
function downloadLeaderCSV(filename, rows) {
	const header = [
		'Usuario',
		'Proyecto',
		'Tarea',
		'Fecha',
		'Horas',
		'Detalle'
	];
	const csvLines = [header.join(',')];
	rows.forEach((t) => {
		// Escapar comas y comillas en campos de texto
		const esc = (s) => {
			const str = (s == null ? '' : String(s));
			if (/[",\n]/.test(str)) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};
		csvLines.push(
			[esc(t.usuario), esc(t.proyecto), esc(t.tarea), esc(t.fecha_inicio), esc(t.horas), esc(t.detalle)].join(',')
		);
	});
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

// Procesa la consulta del líder y responde en el chatbot con botón de descarga
function processLeaderHoursCommand(text) {
	const parsed = parseLeaderQuery(text);
	if (!parsed) return false;

	const { start, end } = getLeaderThisWeekRange();
	const nameToIds = buildUserNameToIdsMap();

	// Resolver ids por cada nombre solicitado
	const namesRequested = [];
	let userIds = [];
	parsed.names.forEach((n) => {
		const key = n.toLowerCase();
		const ids = nameToIds[key] || [];
		namesRequested.push(n);
		userIds = userIds.concat(ids);
	});

	// Si ningún nombre existe en la base, igual mostrar 0h para ellos
	const filtered = userIds.length > 0
		? filterTasksForLeader(parsed.proyecto, userIds, start, end)
		: [];

	const message = buildLeaderSummaryMessage({
		proyecto: parsed.proyecto,
		start,
		end,
		namesRequested,
		tasks: filtered
	});

	// Mostrar confirmación de descarga
	showConfirmation(
		message,
		function () {
			// Confirmó descargar
			const rangoNombre = `${start}_a_${end}`;
			const filename = `horas_${parsed.proyecto.replace(/\s+/g, '_')}_${rangoNombre}.csv`;
			downloadLeaderCSV(filename, filtered);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);

	return true;
}

