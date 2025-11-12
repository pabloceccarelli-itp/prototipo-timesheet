// HU - Líder 10: Generar reporte a pedido del líder de proyecto
// 10.1: “Generame un reporte del Centro de Costo IT”.
// 10.2: “Generame un reporte del Proyecto Alfa”.
// 10.3: “Generame un reporte del Equipo de Daniel”.

// Parsea comando de reporte y determina tipo (centro de costo / proyecto / equipo)
function parseLeaderReportCommand(text) {
	const t = text.trim();

	const centroCostoRegex = /generame\s+un\s+reporte\s+del\s+centro\s+de\s+costo\s+(.+?)\.?$/i;
	const proyectoRegex = /generame\s+un\s+reporte\s+del\s+proyecto\s+(.+?)\.?$/i;
	const equipoRegex = /generame\s+un\s+reporte\s+del\s+equipo\s+de\s+(.+?)\.?$/i;

	let match = t.match(centroCostoRegex);
	if (match) {
		return {
			type: 'centro_costo',
			value: match[1].trim()
		};
	}

	match = t.match(proyectoRegex);
	if (match) {
		return {
			type: 'proyecto',
			value: match[1].trim()
		};
	}

	match = t.match(equipoRegex);
	if (match) {
		return {
			type: 'equipo',
			value: match[1].trim()
		};
	}

	return null;
}

// Filtra tareas por centro de costo
function filterTasksByCentroCosto(centroCosto) {
	return tasksDatabase.filter((t) => {
		if (t.id_usuario === 0) return false; // excluir feriados
		if (!t.horas || t.horas <= 0) return false;
		if (!t.centro_de_costo) return false;
		return String(t.centro_de_costo).toLowerCase() === centroCosto.toLowerCase();
	});
}

// Filtra tareas por proyecto
function filterTasksByProyecto(proyecto) {
	return tasksDatabase.filter((t) => {
		if (t.id_usuario === 0) return false;
		if (!t.horas || t.horas <= 0) return false;
		if (!t.proyecto) return false;
		return String(t.proyecto).toLowerCase() === proyecto.toLowerCase();
	});
}

// Obtiene IDs de usuario por nombre usando usuarios_proyectos
function getUserIdsByName(name) {
	if (!Array.isArray(usuarios_proyectos)) return [];
	const lower = name.toLowerCase();
	return usuarios_proyectos
		.filter((u) => u.usuario && u.usuario.toLowerCase() === lower)
		.map((u) => u.id_usuario);
}

// Filtra tareas para el equipo de un líder (usando id_usuario_lider)
function filterTasksByLeaderTeam(leaderName) {
	if (!Array.isArray(usuarios_proyectos)) return { tasks: [], teamMembers: [], leaderIds: [] };

	const leaderIds = getUserIdsByName(leaderName);
	if (leaderIds.length === 0) {
		return { tasks: [], teamMembers: [], leaderIds: [] };
}

	// Integrantes cuyo id_usuario_lider coincide con algún líder identificado
	const teamMembers = usuarios_proyectos.filter((u) => leaderIds.includes(u.id_usuario_lider));

	// Incluir al propio líder en el equipo
	const leaderMembers = usuarios_proyectos.filter((u) => leaderIds.includes(u.id_usuario));

	const allMembers = [...teamMembers, ...leaderMembers];
	const memberIds = allMembers.map((u) => u.id_usuario);

	const tasks = tasksDatabase.filter((t) => {
		if (t.id_usuario === 0) return false;
		if (!t.horas || t.horas <= 0) return false;
		return memberIds.includes(t.id_usuario);
	});

	return { tasks, teamMembers: allMembers, leaderIds };
}

// Construye mensaje de resumen general usando las tareas filtradas
function buildReportSummaryMessage({ type, value, tasks, label }) {
	if (tasks.length === 0) {
		return `No se encontraron horas cargadas para ${label}.`;
	}

	const { byUser, total } = summarizeTeamTasksByUser(tasks);

	const sortedUsers = Object.entries(byUser)
		.sort((a, b) => b[1] - a[1])
		.map(([name, hours]) => `• ${name}: ${hours}h`);

	const header = `Resumen de horas para ${label}:`;
	const totalLine = `Total acumulado: ${total}h`;
	const tasksLine = `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} registrada${tasks.length !== 1 ? 's' : ''}`;
	const footer = `¿Querés descargar el detalle en Excel (CSV)?`;

	return `${header}\n${sortedUsers.join('\n')}\n${totalLine}\n${tasksLine}\n\n${footer}`;
}

// Procesa el comando de reporte del líder
function processLeaderReportCommand(text) {
	const parsed = parseLeaderReportCommand(text);
	if (!parsed) return false;

	let tasks = [];
	let label = '';

	if (parsed.type === 'centro_costo') {
		tasks = filterTasksByCentroCosto(parsed.value);
		label = `el Centro de Costo "${parsed.value}"`;
	} else if (parsed.type === 'proyecto') {
		tasks = filterTasksByProyecto(parsed.value);
		label = `el proyecto "${parsed.value}"`;
	} else if (parsed.type === 'equipo') {
		const { tasks: teamTasks, teamMembers, leaderIds } = filterTasksByLeaderTeam(parsed.value);

		if (leaderIds.length === 0) {
			addMessage(`No se encontró al líder "${parsed.value}" en la base de usuarios.`);
			return true;
		}

		if (teamMembers.length === 0) {
			addMessage(`No se encontraron colaboradores asociados al líder "${parsed.value}".`);
			return true;
		}

		tasks = teamTasks;
		label = `el equipo de ${parsed.value}`;
	}

	const message = buildReportSummaryMessage({
		type: parsed.type,
		value: parsed.value,
		tasks,
		label
	});

	if (tasks.length === 0) {
		addMessage(message);
		return true;
	}

	showConfirmation(
		message,
		function () {
			let filenameBase = 'reporte';
			if (parsed.type === 'centro_costo') {
				filenameBase = `reporte_cc_${parsed.value.replace(/\s+/g, '_')}`;
			} else if (parsed.type === 'proyecto') {
				filenameBase = `reporte_proyecto_${parsed.value.replace(/\s+/g, '_')}`;
			} else if (parsed.type === 'equipo') {
				filenameBase = `reporte_equipo_${parsed.value.replace(/\s+/g, '_')}`;
			}

			const filename = `${filenameBase}.csv`;
			downloadLeaderCSV(filename, tasks);
			addMessage('✅ Archivo CSV generado y descargado.');
		},
		function () {
			addMessage('De acuerdo. ¿Te ayudo con otra consulta?');
		}
	);

	return true;
}
