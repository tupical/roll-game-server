# Руководство по интеграции и запуску NestJS бэкенда

## Обзор

Этот документ содержит инструкции по установке, запуску и интеграции нового бэкенда на NestJS с существующим фронтендом. Новый бэкенд полностью соответствует принципам SOLID и обеспечивает лучшую масштабируемость, тестируемость и поддерживаемость кода.

## Установка

1. Перейдите в директорию с новым бэкендом:
   ```bash
   cd /home/ubuntu/game-server-nestjs
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

## Запуск

1. Запустите сервер в режиме разработки:
   ```bash
   npm run start:dev
   ```

2. Сервер будет доступен по адресу:
   - HTTP API: http://localhost:3001
   - WebSocket: ws://localhost:3001

## Интеграция с фронтендом

### Обновление клиентской библиотеки

Для интеграции с новым бэкендом необходимо обновить клиентскую библиотеку в вашем фронтенд-проекте. Основные изменения:

1. Обновите URL для подключения к WebSocket:
   ```typescript
   const socket = io('http://localhost:3001');
   ```

2. Используйте новые события WebSocket:
   - `player:join` - присоединение игрока к миру
   - `player:roll` - бросок кубиков
   - `player:move` - перемещение игрока
   - `player:end-turn` - завершение хода

3. Обрабатывайте следующие события от сервера:
   - `player:update` - обновление состояния игрока
   - `map:update` - обновление карты
   - `dice:rolled` - результат броска кубиков
   - `event:triggered` - срабатывание события на клетке
   - `error` - ошибка

### Пример использования API

```typescript
// Создание мира
const createWorld = async () => {
  const response = await fetch('http://localhost:3001/world', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Новый мир' })
  });
  return await response.json();
};

// Получение списка миров
const getWorlds = async () => {
  const response = await fetch('http://localhost:3001/world');
  return await response.json();
};

// Получение видимой карты для игрока
const getVisibleMap = async (worldId, playerId) => {
  const response = await fetch(`http://localhost:3001/game/map/${worldId}/${playerId}`);
  return await response.json();
};
```

### Пример использования WebSocket

```typescript
import { io } from 'socket.io-client';

// Подключение к серверу
const socket = io('http://localhost:3001');

// Присоединение к игре
socket.emit('player:join', {
  worldId: 'world-id',
  playerId: 'player-id',
  username: 'Игрок 1'
});

// Бросок кубиков
socket.emit('player:roll', {
  worldId: 'world-id',
  playerId: 'player-id'
});

// Перемещение игрока
socket.emit('player:move', {
  worldId: 'world-id',
  playerId: 'player-id',
  direction: 0 // 0 - вверх, 1 - вниз, 2 - влево, 3 - вправо
});

// Обработка событий
socket.on('player:update', (data) => {
  console.log('Обновление игрока:', data);
});

socket.on('map:update', (data) => {
  console.log('Обновление карты:', data);
});

socket.on('dice:rolled', (data) => {
  console.log('Результат броска кубиков:', data);
});

socket.on('event:triggered', (data) => {
  console.log('Событие на клетке:', data);
});

socket.on('error', (data) => {
  console.error('Ошибка:', data.message);
});
```

## Архитектура

Новый бэкенд построен на основе NestJS и следует принципам SOLID:

1. **Модульность** - каждый компонент игры выделен в отдельный модуль:
   - `CellModule` - управление ячейками
   - `PlayerModule` - управление игроками
   - `DiceModule` - бросок кубиков
   - `EventModule` - события на ячейках
   - `WorldModule` - управление игровым миром
   - `GameModule` - игровая логика
   - `WebsocketModule` - WebSocket коммуникация

2. **Принцип единой ответственности (SRP)** - каждый класс отвечает только за одну функциональность.

3. **Принцип открытости/закрытости (OCP)** - использование стратегий для обработки событий позволяет добавлять новые типы событий без изменения существующего кода.

4. **Принцип подстановки Лисков (LSP)** - все классы корректно реализуют свои интерфейсы.

5. **Принцип разделения интерфейса (ISP)** - интерфейсы разделены на маленькие, специализированные.

6. **Принцип инверсии зависимостей (DIP)** - все зависимости внедряются через конструкторы.

## Расширение функциональности

Для добавления новых типов событий:

1. Создайте новый тип события в `CellEventType` в файле `src/common/interfaces/game.interface.ts`.
2. Создайте новую стратегию обработки события в директории `src/modules/event/strategies/`.
3. Зарегистрируйте стратегию в `EventService`.

## Тестирование

Для запуска тестов используйте команду:
```bash
npm run test
```

Для запуска тестов с покрытием:
```bash
npm run test:cov
```
