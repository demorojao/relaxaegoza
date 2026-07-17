'use client';

import { useEffect } from 'react';

export default function WebMcpProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = window.navigator as any;
    if (!nav.modelContext) {
      console.log('WebMCP not detected on this browser/agent.');
      return;
    }

    const tools = [
      {
        name: 'list-professionals',
        description: 'Lista as acompanhantes e massoterapeutas de elite disponíveis no portal.',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Estado brasileiro (sigla, ex: SP, RJ)'
            },
            city: {
              type: 'string',
              description: 'Cidade para filtrar'
            },
            category: {
              type: 'string',
              description: 'Categoria (ex: acompanhantes, massagistas)'
            }
          }
        },
        execute: async (args: any) => {
          try {
            const queryParams = new URLSearchParams();
            if (args.state) queryParams.set('state', args.state);
            if (args.city) queryParams.set('city', args.city);
            if (args.category) queryParams.set('category', args.category);

            const res = await fetch(`/api/professionals?${queryParams.toString()}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return await res.json();
          } catch (err: any) {
            return { error: err.message };
          }
        }
      },
      {
        name: 'get-plans',
        description: 'Consulta os planos de assinatura e preços para anunciantes no portal (Pro, Gold, VIP).',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        execute: async () => {
          try {
            const res = await fetch('/api/plans');
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            return await res.json();
          } catch (err: any) {
            return { error: err.message };
          }
        }
      }
    ];

    try {
      if (typeof nav.modelContext.provideContext === 'function') {
        nav.modelContext.provideContext({ tools });
        console.log('WebMCP tools provided successfully via provideContext.');
      } else if (typeof nav.modelContext.registerTool === 'function') {
        for (const tool of tools) {
          nav.modelContext.registerTool(tool);
        }
        console.log('WebMCP tools registered successfully via registerTool.');
      }
    } catch (error) {
      console.error('Failed to initialize WebMCP tools:', error);
    }
  }, []);

  return null;
}
