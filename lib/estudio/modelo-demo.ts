import type { Modelo3D } from './tipos'

/**
 * Modelo de respaldo del estudio.
 *
 * El archivo lo genera `npm run modelo:demo` y vive en `public/modelos/`. No es
 * un modelo de producción: es una silueta de camisa extruida, sin arrugas ni
 * caída de tela. Está para que el visor se pueda probar y para que el estudio
 * tenga algo que enseñar mientras no haya un `.glb` real cargado en
 * `nyx.modelos_3d`.
 *
 * Las medidas están fijadas aquí, no calculadas al cargar, por lo mismo que se
 * guardan en la tabla: medir la caja envolvente exige que la malla ya esté
 * lista, y hacerlo en cada carga del visor es repetir trabajo. El script de
 * comprobación verifica que estos números sigan coincidiendo con el archivo,
 * así que si alguien cambia la silueta y se olvida de actualizarlos, salta.
 */
export const MODELO_DEMO: Modelo3D = {
  id: 'demo-camisa',
  nombre: 'Camisa (modelo de prueba)',
  archivoUrl: '/modelos/camisa-demo.glb',

  // Las UVs que genera ExtrudeGeometry van en unidades del modelo (-36 a 60):
  // no sirven para colocar un diseño y hay que regenerarlas.
  mapeo: 'proyeccion',

  // 73,6 unidades en su lado mayor -> 1/73,6.
  escala: 0.01358575,

  // El generador llama a geometry.center(), así que ya sale centrado.
  centro: { x: 0, y: 0, z: 0 },

  materialesExcluidos: [],
}
