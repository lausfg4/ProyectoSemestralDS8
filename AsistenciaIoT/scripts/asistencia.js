// =====================================================
// VALIDAR ROL Y CARGAR NAVBAR
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const rol = localStorage.getItem("rol");

    if (rol !== "profesor") {
        Swal.fire({
            icon: "warning",
            title: "Acceso denegado",
            text: "Esta sección es solo para profesores.",
            confirmButtonColor: "#532b80"
        }).then(() => window.location.href = "Inicio.html");
        return;
    }

    document.getElementById("navbar").innerHTML = `
        <a class="nav-item" href="InicioProfesor.html">Inicio</a>
        <a class="nav-item active" href="Asistencia.html">Asistencia</a>
        <a class="nav-item" href="HorarioProfesor.html">Horario</a>

        <div class="nav-right">
            <a href="login.html" class="btn-logout" onclick="cerrarSesion()">Cerrar sesión</a>
        </div>
    `;
});

// Logout
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}



// =====================================================
// CARGAR MATERIAS REALES DEL PROFESOR DESDE API
// =====================================================
async function cargarMaterias(grupo) {
    document.querySelector(".titulo-panel").innerText = "Materias del profesor";
    document.getElementById("listaAsistencias").innerHTML = "";

    const token = localStorage.getItem("token");

    const res = await fetch("http://161.35.190.4:8000/api/asignaturas_del_profesor/", {
        headers: { "Authorization": "Token " + token }
    });

    let materias = await res.json();
    console.log("Materias recibidas:", materias);

    // Si el backend devuelve un solo objeto lo convertimos en lista
    if (!Array.isArray(materias)) {
        materias = [materias];
    }

    // Si no vienen materias
    if (materias.length === 0) {
        document.getElementById("listaMaterias").innerHTML =
            "<div class='materia-item'>No hay materias asignadas.</div>";
        return;
    }

    // Renderizar materias
    document.getElementById("listaMaterias").innerHTML = materias
        .map(m => `
            <div class='materia-item'
                onclick="cargarAsistencias(${m.materia_id}, '${m.nombre}')">
                ${m.nombre}
            </div>
        `)
        .join("");

    document.getElementById("listaMaterias").style.display = "block";
}



// =====================================================
// CARGAR ASISTENCIAS POR MATERIA USANDO FECHA REAL
// =====================================================
async function cargarAsistencias(materia_id, nombre_materia) {
    document.querySelector(".titulo-panel").innerText = nombre_materia;

    const token = localStorage.getItem("token");

    // Obtener horarios del profesor
    const res = await fetch("http://161.35.190.4:8000/api/clases_del_dia/", {
        headers: { "Authorization": "Token " + token }
    });

    let clases = await res.json();
    console.log("Clases recibidas:", clases);

    if (!Array.isArray(clases)) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudieron obtener los horarios."
        });
        return;
    }

    // Filtrar horarios de esta materia
    const horarios = clases.filter(c => c.materia === nombre_materia);

    let html = "";

    for (let h of horarios) {
        // ➜ Obtener la FECHA REAL desde asistencia_clase
        const resAsist = await fetch(`http://161.35.190.4:8000/api/asistencia_clase/${h.horario_id}/`, {
            headers: { "Authorization": "Token " + token }
        });

        const registros = await resAsist.json();

        // Si hay registros, tomamos la fecha del primero
        let fecha = "Sin fecha";

        if (Array.isArray(registros) && registros.length > 0) {
            fecha = registros[0].fecha_registro.split(" ")[0];  // YYYY-MM-DD
        }

        html += `
            <div class="asistencia-item">
                Asistencia (${fecha})
                <button class="btn" onclick="verAsistentes(${h.horario_id})">PDF</button>
            </div>
        `;
    }

    document.getElementById("listaMaterias").style.display = "none";
    document.getElementById("listaAsistencias").innerHTML = html;
}


// =============================================
// MOSTRAR TABLA EDITABLE PARA EL PROFESOR
// =============================================
async function verAsistentes(horario_id) {
    const token = localStorage.getItem("token");

    const res = await fetch(`http://161.35.190.4:8000/api/asistencia_clase/${horario_id}/`, {
        headers: { "Authorization": "Token " + token }
    });

    const data = await res.json();
    console.log("Asistencias:", data);

    if (!Array.isArray(data) || data.length === 0) {
        Swal.fire("Sin registros", "No hay asistencias", "info");
        return;
    }

    const tabla = document.querySelector("#tablaEdicion tbody");
    tabla.innerHTML = "";

    data.forEach(a => {
tabla.innerHTML += `
    <tr data-asistencia="${a.asistencia_id}">
        <td>${a.nombre}</td>
        <td>${a.cedula}</td>

        <td>
            <input type="checkbox" ${a.presente ? "checked" : ""} id="p_${a.asistencia_id}">
        </td>

        <td>
            <input type="text" value="${a.comentario || ""}" id="c_${a.asistencia_id}">
        </td>
    </tr>
`;

    });

    // Mostrar panel
    document.getElementById("editorAsistencia").style.display = "block";
}


// =============================================
// GUARDAR CAMBIOS (PUNTO QUE ME PEDISTE AGREGAR)
// =============================================
async function guardarAsistencia(estudiante_id, horario_id) {
    const token = localStorage.getItem("token");

    const presente = document.getElementById(`p_${estudiante_id}`).checked;
    const comentario = document.getElementById(`c_${estudiante_id}`).value;

    const res = await fetch(`http://161.35.190.4:8000/api/editar_asistencia/${estudiante_id}/`, {
        method: "POST",
        headers: {
            "Authorization": "Token " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            presente: presente,
            comentario: comentario
        })
    });

    const r = await res.json();
    console.log("Actualizado:", r);

    Swal.fire("Guardado", "Asistencia actualizada", "success");
}


// =============================================
// CERRAR PANEL EDITOR
// =============================================
function cerrarEditor() {
    document.getElementById("editorAsistencia").style.display = "none";
}


// =============================================
// GENERAR PDF FINAL (DESPUÉS DE EDITAR)
// =============================================
// =====================================================
// GENERAR PDF FINAL DESPUÉS DE EDITAR EN PANTALLA
// =====================================================
async function generarPDFfinal() {

    // 1. Tomamos los datos DIRECTAMENTE DE LA TABLA EDITABLE
    const filas = document.querySelectorAll("#tablaEdicion tbody tr");

    if (filas.length === 0) {
        Swal.fire("No hay datos", "No hay asistencias cargadas.", "info");
        return;
    }

    // Tabla para PDF
    const tablaPDF = [];

    filas.forEach(fila => {
        const columnas = fila.querySelectorAll("td");

        const nombre = columnas[0].innerText;
        const cedula = columnas[1].innerText;

        const presente = columnas[2].querySelector("input").checked ? "Presente" : "Ausente";
        const comentario = columnas[3].querySelector("input").value;

        tablaPDF.push([nombre, cedula, presente, comentario]);
    });

    // 2. Crear PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título del documento
    doc.setFontSize(18);
    doc.text("Reporte Final de Asistencia", 14, 20);

    doc.setFontSize(12);
    const fecha = new Date().toISOString().split("T")[0];
    doc.text(`Fecha del reporte: ${fecha}`, 14, 30);

    // 3. Crear tabla
    doc.autoTable({
        head: [["Nombre", "Cédula", "Asistencia", "Comentario"]],
        body: tablaPDF,
        startY: 40
    });

    // 4. Descargar
    doc.save(`reporte_asistencia_${fecha}.pdf`);

    Swal.fire("PDF generado", "El archivo ha sido descargado.", "success");
}

// =====================================================
// GUARDAR TODA LA ASISTENCIA DE UNA VEZ
// =====================================================
async function guardarTodo() {
    const token = localStorage.getItem("token");
    const filas = document.querySelectorAll("#tablaEdicion tbody tr");

    if (filas.length === 0) {
        Swal.fire("Sin datos", "No hay asistencia para guardar.", "info");
        return;
    }

    let actualizados = 0;

    for (let fila of filas) {
        const asistencia_id = fila.getAttribute("data-asistencia");

        const presente = document.getElementById(`p_${asistencia_id}`).checked;
        const comentario = document.getElementById(`c_${asistencia_id}`).value;

        await fetch(`http://161.35.190.4:8000/api/editar_asistencia/${asistencia_id}/`, {
            method: "POST",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                presente: presente,
                comentario: comentario
            })
        });

        actualizados++;
    }

    Swal.fire(
        "Asistencia guardada",
        `${actualizados} registros fueron actualizados correctamente.`,
        "success"
    );
}


