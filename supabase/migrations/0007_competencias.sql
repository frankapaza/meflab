-- ═══════════════════════════════════════════════════════════════════════
-- 0007 · COMPETENCIAS Y ASIGNACIÓN SUGERIDA  (Fase 3.3 · AC-01 §8)
--
-- Las tablas ya existen desde 0005. Lo que falta es lo que las hace
-- útiles: saber a QUIÉN conviene asignarle una etapa.
--
-- La sugerencia combina dos cosas que suelen mirarse por separado:
--
--   COMPETENCIA · quién sabe hacerlo, y a qué nivel
--   CARGA       · quién tiene hueco
--
-- Mirar sólo la carga asigna cerámica al que está libre aunque no sepa
-- hacerla. Mirar sólo la competencia satura siempre al mismo. Por eso la
-- sugerencia devuelve las dos cifras y no un único "elegido": decide el
-- líder, que sabe cosas que el sistema no —que hoy falta uno, que ese
-- doctor es delicado— y necesita ver POR QUÉ se le propone cada nombre.
--
-- Degradación deliberada: si el laboratorio no ha declarado competencias
-- —y hoy no lo ha hecho, es una decisión abierta con límite en la semana
-- 21— la función sigue sirviendo y ordena sólo por carga, que es lo que
-- se hace hoy a mano. Nunca devuelve vacío por falta de configuración.
-- ═══════════════════════════════════════════════════════════════════════

/**
 * A quién conviene asignarle una etapa de este proceso.
 *
 * Devuelve a TODOS los técnicos del área, ordenados, con el porqué a la
 * vista. No filtra a los que no saben: los baja del todo y los marca,
 * porque a veces hay que asignar igual y conviene que se vea que es una
 * excepción, no un descuido.
 */
create or replace function public.sugerir_tecnico(p_proceso uuid)
returns table (
  usuario_id     uuid,
  nombre         text,
  nivel          smallint,
  nivel_minimo   smallint,
  cumple         boolean,
  acreditada     boolean,
  tareas_activas bigint,
  horas_pendientes numeric,
  motivo         text
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with exigencia as (
    -- Qué competencia pide este proceso. Si no pide ninguna, todo el
    -- mundo "cumple": el criterio pasa a ser sólo la carga.
    select pc.competencia_id, pc.nivel_minimo
      from public.proceso_competencia pc
     where pc.proceso_id = p_proceso
     order by pc.nivel_minimo desc
     limit 1
  ),
  area_del_proceso as (
    select p.area_id from public.proceso p where p.id = p_proceso
  ),
  tecnicos as (
    select u.id, u.nombre
      from public.usuario u
      join public.usuario_rol ur on ur.usuario_id = u.id
     where u.activo
       and ur.rol = 'tecnico'
       -- Del área del proceso. Con un área única —que es el caso hoy—
       -- esto no filtra a nadie, y cuando se definan áreas empieza a
       -- filtrar solo, sin tocar esta función.
       and u.area_id = (select area_id from area_del_proceso)
  ),
  carga as (
    select t.tecnico_id,
           count(*) as tareas,
           coalesce(sum(t.horas_estimadas), 0) as horas
      from public.tarea_produccion t
     where t.estado in ('asignada', 'en_curso')
     group by t.tecnico_id
  )
  select
    tec.id,
    tec.nombre,
    coalesce(tc.nivel, 0)::smallint,
    coalesce(e.nivel_minimo, 0)::smallint,
    -- Sin competencia exigida, cumple todo el mundo.
    (e.competencia_id is null or coalesce(tc.nivel, 0) >= e.nivel_minimo) as cumple,
    (tc.acreditada_por is not null) as acreditada,
    coalesce(c.tareas, 0),
    coalesce(c.horas, 0),
    case
      when e.competencia_id is null then 'Este proceso no exige competencia declarada'
      when coalesce(tc.nivel, 0) = 0 then 'No tiene declarada la competencia que pide el proceso'
      when tc.nivel < e.nivel_minimo then 'Su nivel está por debajo del mínimo del proceso'
      when tc.acreditada_por is null then 'Competencia declarada pero SIN acreditar'
      else 'Cumple el nivel exigido'
    end
  from tecnicos tec
  left join exigencia e on true
  left join public.tecnico_competencia tc
         on tc.usuario_id = tec.id and tc.competencia_id = e.competencia_id
  left join carga c on c.tecnico_id = tec.id
  -- Primero los que cumplen; entre ellos, el menos cargado; y a igualdad
  -- de carga, el de más nivel. Ordenar por nivel antes que por carga
  -- satura siempre al mejor, que es como se quema.
  order by
    (e.competencia_id is null or coalesce(tc.nivel, 0) >= e.nivel_minimo) desc,
    coalesce(c.horas, 0) asc,
    coalesce(tc.nivel, 0) desc,
    tec.nombre;
$fn$;

comment on function public.sugerir_tecnico is
  'AC-01 §8. Combina competencia y carga, y devuelve el porqué. Sin competencias declaradas ordena sólo por carga.';

grant execute on function public.sugerir_tecnico(uuid) to authenticated;

/**
 * Competencias declaradas y sin acreditar.
 *
 * AC-01 §8 pide poder detectarlas. Una competencia que alguien se
 * atribuyó y nadie respaldó no es un dato erróneo —puede ser cierta— pero
 * es la que conviene revisar antes de asignarle el trabajo delicado.
 */
create or replace view public.v_competencia_sin_acreditar
with (security_invoker = true) as
select
  tc.tenant_id,
  tc.usuario_id,
  u.nombre       as tecnico,
  tc.competencia_id,
  c.codigo,
  c.nombre       as competencia,
  tc.nivel,
  tc.created_at  as declarada_en
from public.tecnico_competencia tc
join public.usuario u on u.id = tc.usuario_id
join public.competencia c on c.id = tc.competencia_id
where tc.acreditada_por is null;

grant select on public.v_competencia_sin_acreditar to authenticated;

/**
 * Procesos que ningún técnico activo puede cubrir.
 *
 * Es el riesgo que nadie mira hasta que el único que sabe hacer algo se
 * va de vacaciones. Un proceso sin nadie que lo cubra no es un problema
 * de hoy: es uno que aparecerá el día peor.
 */
create or replace view public.v_proceso_sin_cobertura
with (security_invoker = true) as
select
  p.tenant_id,
  p.id      as proceso_id,
  p.codigo,
  p.nombre,
  c.nombre  as competencia,
  pc.nivel_minimo,
  count(tc.usuario_id) filter (
    where tc.nivel >= pc.nivel_minimo
  ) as tecnicos_que_cubren
from public.proceso p
join public.proceso_competencia pc on pc.proceso_id = p.id
join public.competencia c on c.id = pc.competencia_id
left join public.tecnico_competencia tc
       on tc.competencia_id = pc.competencia_id
left join public.usuario u on u.id = tc.usuario_id and u.activo
where p.activo
group by p.tenant_id, p.id, p.codigo, p.nombre, c.nombre, pc.nivel_minimo
having count(tc.usuario_id) filter (where tc.nivel >= pc.nivel_minimo) <= 1;

comment on view public.v_proceso_sin_cobertura is
  'Procesos que cubre uno o ningún técnico. El riesgo aparece el día que esa persona falta.';

grant select on public.v_proceso_sin_cobertura to authenticated;
