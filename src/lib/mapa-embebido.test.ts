import { describe, expect, it } from "vitest";

import { direccionDeMapa, esDireccionDeMapa } from "./mapa-embebido";

/**
 * Este validador decide qué puede acabar en un `<iframe src>` de dos páginas
 * públicas. Las pruebas están escritas desde el ataque, no desde el caso feliz:
 * lo que importa no es que el mapa del hotel pase, sino que no pase nada más.
 */
describe("direccionDeMapa", () => {
  it("acepta el mapa que el sitio usa hoy", () => {
    const actual =
      "https://maps.google.com/maps?q=3.5068719,-76.6267478(La+Finca+Eco+Hotel)&z=15&hl=es&ie=UTF8&output=embed";
    expect(direccionDeMapa(actual)).toBe(actual);
  });

  it("acepta la forma «Insertar un mapa» de Google", () => {
    const url = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3";
    expect(direccionDeMapa(url)).toBe(url);
  });

  it("rechaza un host que no es de Google", () => {
    expect(direccionDeMapa("https://maps.evil.com/maps?output=embed")).toBeNull();
    expect(
      direccionDeMapa("https://google.com.attacker.net/maps?output=embed"),
    ).toBeNull();
    expect(direccionDeMapa("https://sitio-falso.com/pago")).toBeNull();
  });

  it("rechaza `javascript:` y `data:`, que en un src serían ejecución de código", () => {
    expect(direccionDeMapa("javascript:alert(document.cookie)")).toBeNull();
    expect(direccionDeMapa("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rechaza http:// aunque el host sea de Google", () => {
    expect(direccionDeMapa("http://maps.google.com/maps?output=embed")).toBeNull();
  });

  it("rechaza una ruta de Google que no es un embebido", () => {
    /* Sin `output=embed` el iframe carga la interfaz completa de Maps, que
       Google además bloquea con X-Frame-Options: no es un mapa, es un hueco. */
    expect(direccionDeMapa("https://maps.google.com/maps?q=cali")).toBeNull();
    expect(direccionDeMapa("https://www.google.com/search?q=cali")).toBeNull();
    expect(direccionDeMapa("https://www.google.com/maps/embed")).toBeNull();
  });

  it("trata el vacío y la basura como «no hay mapa», no como error", () => {
    expect(direccionDeMapa("")).toBeNull();
    expect(direccionDeMapa("   ")).toBeNull();
    expect(direccionDeMapa(null)).toBeNull();
    expect(direccionDeMapa(undefined)).toBeNull();
    expect(direccionDeMapa("no es una url")).toBeNull();
  });

  it("no se deja confundir por espacios alrededor", () => {
    const url = "https://www.google.com/maps/embed?pb=!1m18";
    expect(direccionDeMapa(`  ${url}  `)).toBe(url);
  });

  it("esDireccionDeMapa responde lo mismo en forma de booleano", () => {
    expect(esDireccionDeMapa("https://www.google.com/maps/embed?pb=x")).toBe(true);
    expect(esDireccionDeMapa("https://otro.com")).toBe(false);
  });
});
